// Osman Zakir 
// 3 / 16 / 2018 
// Google Maps GUI + Currency Converter Web Application 
// This application uses a Google Map as its UI.  The user's geolocation is taken if the browser has permission, and an info window 
// is opened at that location which displays a HTML form.  The form has an input element to type in the amount of money in the base 
// currency to convert, two dropdown menus populated with a list of currencies requested from the currency API, and a button to submit 
// the form. By default, the base currency is USD and the resulting currency is the currency used at the place that the info window is 
// opened on.

// Google's Geocoder and Reverse Geocoding Service returns status "ZERO_RESULTS" for Western Sahara, Wake Island, and Kosovo. The second
// dropdown menu switches to AED in that situation. The status means that there are no results to show even though reverse 
// geocodng did work.

// This C++ application is the web server for the application. It acts as both a server and a client, as it also has to query 
// the currency API, at openexchangerates.org on its currency conversion endpoint and get the conversion result to return 
// to the front-end code.  It also holds two environment variables, one to hold the Google Maps API Key and the other 
// to hold the openexchagerates.org API key.  
// Note: path_cat() function needs boost::string_view, aliased as boost::beast::string_view in the Boost library, as do some
// other places.  I used std::string_view to pass a string to a function as an input parameter where I could.

#include "server_certificate.hpp"
#include "root_certificate.hpp"

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/ssl/stream.hpp>
#include <boost/asio/ssl/error.hpp>
#include <boost/asio/connect.hpp>
#include <jinja2cpp/template.h>
#include <jinja2cpp/value.h>
#include <jinja2cpp/template_env.h>
#include <string_view>
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <map>
#include <cctype>
#include <iostream>
#include <vector>
#include <memory>
#include <string>
#include <thread>
#include <nlohmann/json.hpp>

using json = nlohmann::json;			// from <nlohmann/json.hpp>
using tcp = boost::asio::ip::tcp;       // from <boost/asio/ip/tcp.hpp>
namespace ssl = boost::asio::ssl;       // from <boost/asio/ssl.hpp>
namespace http = boost::beast::http;    // from <boost/beast/http.hpp>

										//------------------------------------------------------------------------------

										// Function to return a reasonable mime type based on the extension of a file.
boost::beast::string_view mime_type(boost::beast::string_view path);

// This class represents a cache for storing results from the
// currency exchange API used by bankersalgo.com
class cache_storage
{
public:
	cache_storage(const std::chrono::seconds& duration)
		: m_cache_conv{}, m_cache_list{}, m_duration{ duration }
	{
	}

	// This function queries the currency API after making sure
	// that the stored result(s) is/are old enough
	// It also makes a new query to the API if needed
	const json& query_rate(std::string_view query_data, std::string_view currencykey, const json& sentry);

	// This function queries the currency API for a list of currencies
	const json& query_list(std::string_view currencykey, std::string_view mapkey, const json& sentry);

private:
	// The cache for the conversion rate result
	std::map<std::tuple<std::string_view>, std::pair<std::chrono::time_point<std::chrono::steady_clock>, json>> m_cache_conv;

	// The cache for the currency list
	std::map<std::string_view, std::pair<std::chrono::time_point<std::chrono::steady_clock>, json>> m_cache_list;

	std::chrono::seconds m_duration;
};

// Parse POST body
std::map<std::string, std::string> parse(std::string_view data);

// Append an HTTP rel-path to a local filesystem path.
// The returned path is normalized for the platform.
std::string path_cat(boost::beast::string_view base, boost::beast::string_view path);

// This function produces an HTTP response for the given
// request. The type of the response object depends on the
// contents of the request, so the interface requires the
// caller to pass a generic lambda for receiving the response.
template<class Body, class Allocator, class Send>
void handle_request(boost::beast::string_view doc_root, http::request<Body, http::basic_fields<Allocator>> &&req,
	Send &&send, std::string_view googlekey, std::string_view currencykey);

//------------------------------------------------------------------------------

// Report a failure
void fail(boost::system::error_code ec, const char *what);

// The function object is used to send an HTTP message.
template<class Stream>
struct send_lambda
{
	Stream &stream_;
	bool &close_;
	boost::system::error_code &ec_;

	explicit send_lambda(Stream &stream, bool &close, boost::system::error_code &ec)
		: stream_{ stream }, close_{ close }, ec_{ ec }
	{
	}

	template<bool isRequest, class Body, class Fields>
	void operator()(http::message<isRequest, Body, Fields> &&msg) const;
};

// Handles an HTTP server connection
void do_session(tcp::socket &socket, ssl::context &ctx, const std::string &doc_root, std::string_view googlekey,
	std::string_view currencykey);

// Converts jinja2::ErrorInfo object to std::string
std::string error_to_string(const jinja2::ErrorInfo &error);

// Performs currency conversion calculation
double calc_result(const double money_amount, const double conversion_rate);

int main(int argc, char* argv[])
{
	try
	{
		// Check command line arguments.
		if (argc != 4)
		{
			std::cerr <<
				"Usage: currency_converter <address> <port> <doc_root>\n" <<
				"Example:\n" <<
				"    ./currency_converter 0.0.0.0 8080 .";
			return EXIT_FAILURE;
		}
		const auto address{ boost::asio::ip::make_address(argv[1]) };
		const auto port{ static_cast<unsigned short>(std::atoi(argv[2])) };
		const auto doc_root{ std::string(argv[3]) };

		// The io_context is required for all I/O
		boost::asio::io_context ioc{ 1 };
		
		// The SSL context is required, and holds certificates
		ssl::context ctx{ ssl::context::tlsv12_server };

		// This holds the signed certificate used by the server
		load_server_certificate(ctx);

		// Google API Key
		std::string googlekey_str{ std::getenv("googlekey") };
		std::string_view googlekey{ googlekey_str };

		// Open Exchange Rates Currency API App ID/API key
		std::string currencykey_str{ std::getenv("currencykey") };
		std::string_view currencykey{ currencykey_str };

		// The acceptor receives incoming connections
		tcp::acceptor acceptor{ ioc, { address, port } };
		std::cout << "Starting server at " << address << ':' << port << "...\n";
		for (;;)
		{
			// This will receive the new connection
			tcp::socket socket{ ioc };

			// Block until we get a connection
			acceptor.accept(socket);

			// Launch the session, transferring ownership of the socket
			std::thread([=, socket = std::move(socket), &ctx]() mutable {
				do_session(socket, ctx, doc_root, googlekey, currencykey);
			}).detach();
		}
	}
	catch (const std::runtime_error &e)
	{
		std::cerr << "Line 185: Error: " << e.what() << '\n';
		return EXIT_FAILURE;
	}
	catch (const std::exception &e)
	{
		std::cerr << "Line 190: Error: " << e.what() << '\n';
		return EXIT_FAILURE + 1;
	}
}

// Function to return a reasonable mime type based on the extension of a file.
boost::beast::string_view mime_type(boost::beast::string_view path)
{
	using boost::beast::iequals;
	const auto ext = [&path]
	{
		const auto pos = path.rfind(".");
		if (pos == boost::beast::string_view::npos)
		{
			return boost::beast::string_view{};
		}
		return path.substr(pos);
	}();
	if (iequals(ext, ".htm"))
	{
		return "text/html";
	}
	if (iequals(ext, ".html"))
	{
		return "text/html";
	}
	if (iequals(ext, ".php"))
	{
		return "text/html";
	}
	if (iequals(ext, ".css"))
	{
		return "text/css";
	}
	if (iequals(ext, ".txt"))
	{
		return "text/plain";
	}
	if (iequals(ext, ".js"))
	{
		return "application/javascript";
	}
	if (iequals(ext, ".json"))
	{
		return "application/json";
	}
	if (iequals(ext, ".xml"))
	{
		return "application/xml";
	}
	if (iequals(ext, ".swf"))
	{
		return "application/x-shockwave-flash";
	}
	if (iequals(ext, ".flv"))
	{
		return "video/x-flv";
	}
	if (iequals(ext, ".png"))
	{
		return "image/png";
	}
	if (iequals(ext, ".jpe"))
	{
		return "image/jpeg";
	}
	if (iequals(ext, ".jpeg"))
	{
		return "image/jpeg";
	}
	if (iequals(ext, ".jpg"))
	{
		return "image/jpeg";
	}
	if (iequals(ext, ".gif"))
	{
		return "image/gif";
	}
	if (iequals(ext, ".bmp"))
	{
		return "image/bmp";
	}
	if (iequals(ext, ".ico"))
	{
		return "image/vnd.microsoft.icon";
	}
	if (iequals(ext, ".tiff"))
	{
		return "image/tiff";
	}
	if (iequals(ext, ".tif"))
	{
		return "image/tiff";
	}
	if (iequals(ext, ".svg"))
	{
		return "image/svg+xml";
	}
	if (iequals(ext, ".svgz"))
	{
		return "image/svg+xml";
	}
	return "application/text";
}

// Append an HTTP rel-path to a local filesystem path.
// The returned path is normalized for the platform.
std::string path_cat(boost::beast::string_view base, boost::beast::string_view path)
{
	if (base.empty())
	{
		return path.to_string();
	}
	std::string result{ base };
#if BOOST_MSVC
	constexpr char path_separator = '\\';
	if (result.back() == path_separator)
	{
		result.resize(result.size() - 1);
	}
	result.append(path.data(), path.size());
	for (auto &c : result)
	{
		if (c == '/')
		{
			c = path_separator;
		}
	}
#else
	constexpr char path_separator = '/';
	if (result.back() == path_separator)
	{
		result.resize(result.size() - 1);
	}
	result.append(path.data(), path.size());
#endif
	return result;
}

// Parse POST body
// Function uses state machine to parse POST body. Newlines
// and spaces are ignored. If it sees a quote, it'll read the next 
// stuff until it encounters a space into the value string.  The values
// are added to the parsed_values vector and that vector is returned back
std::map<std::string, std::string> parse(std::string_view data)
{
	enum class States
	{
		Start,
		Name,
		Ignore,
		Value
	};

	std::map<std::string, std::string> parsed_values;
	std::string name;
	std::string value;

	States state = States::Start;
	for (const char c : data)
	{
		switch (state)
		{
		case States::Start:
			if (c == '"')
			{
				state = States::Name;
			}
			break;
		case States::Name:
			if (c != '"')
			{
				name += c;
			}
			else
			{
				state = States::Ignore;
			}
			break;
		case States::Ignore:
			if (!isspace(c))
			{
				state = States::Value;
				value += c;
			}
			break;
		case States::Value:
			if (c != '\n')
			{
				value += c;
			}
			else
			{
				parsed_values.insert(std::make_pair(name, value));
				name = "";
				value = "";
				state = States::Start;
			}
			break;
		}
	}
	return parsed_values;
}

// This function produces an HTTP response for the given
// request. The type of the response object depends on the
// contents of the request, so the interface requires the
// caller to pass a generic lambda for receiving the response.
template<class Body, class Allocator, class Send>
void handle_request(boost::beast::string_view doc_root, http::request<Body, http::basic_fields<Allocator>> &&req,
	Send &&send, std::string_view googlekey, std::string_view currencykey)
{
	// Returns a bad request response
	const auto bad_request = [&req](boost::beast::string_view why)
	{
		http::response<http::string_body> res{ http::status::bad_request, req.version() };
		res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
		res.set(http::field::content_type, "text/html");
		res.keep_alive(req.keep_alive());
		res.body() = why.to_string();
		res.prepare_payload();
		return res;
	};

	// Returns a not found response
	const auto not_found = [&req](boost::beast::string_view target)
	{
		http::response<http::string_body> res{ http::status::not_found, req.version() };
		res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
		res.set(http::field::content_type, "text/html");
		res.keep_alive(req.keep_alive());
		res.body() = "The resource '" + target.to_string() + "' was not found.";
		res.prepare_payload();
		return res;
	};

	// Returns a server error response
	const auto server_error = [&req](boost::beast::string_view what)
	{
		http::response<http::string_body> res{ http::status::internal_server_error, req.version() };
		res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
		res.set(http::field::content_type, "text/html");
		res.keep_alive(req.keep_alive());
		res.body() = "An error occurred: '" + what.to_string() + "'";
		res.prepare_payload();
		return res;
	};

	// Make sure we can handle the method
	if (req.method() != http::verb::get &&
		req.method() != http::verb::head &&
		req.method() != http::verb::post)
	{
		return send(bad_request("Unknown HTTP-method"));
	}

	// Request path must be absolute and not contain "..".
	if (req.target().empty() ||
		req.target()[0] != '/' ||
		req.target().find("..") != boost::beast::string_view::npos)
	{
		return send(bad_request("Illegal request-target"));
	}

	// Build the path to the requested file
	std::string path;
	if (req.target() != "/?q=googlekey" && req.target() != "/?q=currency_list")
	{
		path = path_cat(doc_root, req.target());
		if (req.target().back() == '/')
		{
			path.append("index.html");
		}
	}

	// Attempt to open the file
	boost::beast::error_code ec;
	http::file_body::value_type body;
	if (req.target() != "/" && req.target() != "/?q=currency_list" && req.target() != "/?q=googlekey")
	{
		body.open(path.c_str(), boost::beast::file_mode::scan, ec);
	}

	// Handle the case where the file doesn't exist
	if (ec == boost::system::errc::no_such_file_or_directory)
	{
		return send(not_found(req.target()));
	}

	// Handle an unknown error
	if (ec)
	{
		return send(server_error(ec.message()));
	}

	// Respond to GET request
	if (req.method() == http::verb::get)
	{
		if (req.target() == "/?q=currency_list")
		{
			using namespace std::chrono_literals;
			using namespace std::string_literals;
			cache_storage cache{ 1h };
			const json sentry = nullptr;
			std::string mapkey{ "currency_list"s };
			json currency_list = cache.query_list(currencykey, mapkey, sentry);

			http::response<http::string_body> res{
				std::piecewise_construct,
				std::make_tuple(std::move(currency_list)),
				std::make_tuple(http::status::ok, req.version()) };
			res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
			res.set(http::field::content_type, "application/json");
			res.content_length(res.body().size());
			res.keep_alive(req.keep_alive());
			return send(std::move(res));
		}
		else if (req.target() == "/")
		{
			jinja2::Template tpl;
			tpl.LoadFromFile(path.c_str());
			jinja2::ValuesMap params{ { { "googlekey", std::string(googlekey) } } };
			auto render_result = tpl.RenderAsString(params);

			if (!render_result)
			{
				auto error_info = render_result.error();
				std::string error_info_str = error_to_string(error_info);
				return send(server_error(error_info_str));
			}
			auto &content = render_result.value();

			http::response<http::string_body> res{
				std::piecewise_construct,
				std::make_tuple(content),
				std::make_tuple(http::status::ok, req.version()) };
			res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
			res.set(http::field::content_type, "text/html");
			//res.set(http::field::content_length, content.size());
			res.set(http::field::access_control_allow_origin, "https://www.osmanzakir.dynu.net");
			res.keep_alive(req.keep_alive());
			return send(std::move(res));
		}
		else
		{
			http::response<http::file_body> res{
			   std::piecewise_construct,
			   std::make_tuple(std::move(body)),
			   std::make_tuple(http::status::ok, req.version()) };
			res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
			res.set(http::field::content_type, mime_type(path));
			res.content_length(body.size());
			res.keep_alive(req.keep_alive());
			return send(std::move(res));
		}
	}

	// Respond to POST request
	else if (req.method() == http::verb::post)
	{
		boost::beast::string_view content_type{ req[http::field::content_type] };
		if (content_type.find("multipart/form-data") == std::string::npos &&
			content_type.find("application/x-www-form-urlencoded") == std::string::npos)
		{
			return send(bad_request("Bad request"));
		}

		using namespace std::string_literals;
		std::map<std::string, std::string> parsed_value{ parse(req.body()) };
		auto money_amount{ std::stod(parsed_value["currency_amount"]) };
		auto to_currency{ parsed_value["to_currency"] };
		auto to_abbr{ to_currency.substr(0, to_currency.find_first_of(' ')) };
		std::string_view query_data{ to_abbr };
		using namespace std::chrono_literals;
		cache_storage cache{ 1h };
		const json sentry = nullptr;
		double conversion_rate{ cache.query_rate(query_data, currencykey, sentry) };
		double conversion_result{ calc_result(money_amount, conversion_rate) };

		http::response<http::string_body> res{
			std::piecewise_construct,
			std::make_tuple(std::to_string(conversion_result) + " " + to_abbr),
			std::make_tuple(http::status::ok, req.version()) };
		res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
		res.set(http::field::content_type, "text/plain");
		res.content_length(res.body().size());
		res.keep_alive(req.keep_alive());
		return send(std::move(res));
	}
}

// Converts jinja2::ErrorInfo object to std::string
// Feeds error info object into ostringstream to convert
// to a std::string
std::string error_to_string(const jinja2::ErrorInfo& error)
{
	std::ostringstream error_info_stream;
	error_info_stream << error;
	return error_info_stream.str();
}

// Report a failure
void fail(boost::system::error_code ec, const char *what)
{
	std::cerr << what << ": " << ec.message() << "\n";
}

template<class Stream>
template<bool isRequest, class Body, class Fields>
void send_lambda<Stream>::operator()(http::message<isRequest, Body, Fields> &&msg) const
{
	// Determine if we should close the connection after
	close_ = msg.need_eof();

	// We need the serializer here because the serializer requires
	// a non-const file_body, and the message oriented version of
	// http::write only works with const messages.
	http::serializer<isRequest, Body, Fields> sr{ msg };
	http::write(stream_, sr, ec_);
}

// Handles an HTTP server connection
void do_session(tcp::socket &socket, ssl::context &ctx, const std::string &doc_root, std::string_view googlekey,
	std::string_view currencykey)
{
	bool close{};
	boost::system::error_code ec;

	// Construct the stream around the socket
	ssl::stream<tcp::socket&> stream{ socket, ctx };

	// Perform the SSL handshake
	stream.handshake(ssl::stream_base::server, ec);
	if (ec)
	{
		std::cerr << "Lines 625 and 626:\n";
		fail(ec, "handshake");
	}

	// This buffer is required to persist across reads 
	boost::beast::flat_buffer buffer;

	// This lambda is used to send messages 
	send_lambda<ssl::stream<tcp::socket&>> lambda{ stream, close, ec };

	for (;;)
	{
		// Read a request 
		http::request<http::string_body> req;
		http::read(stream, buffer, req, ec);
		if (ec == http::error::end_of_stream)
		{
			break;
		}
		if (ec)
		{
			std::cerr << "Lines 646 and 647:\n";
			return fail(ec, "read");
		}

		// Send the response 
		handle_request(doc_root, std::move(req), lambda, googlekey, currencykey);
		if (ec)
		{
			std::cerr << "Lines 654 and 655:\n";
			return fail(ec, "write");
		}
		if (close)
		{
			// This means we should close the connection, usually because 
			// the response indicated the "Connection: close" semantic. 
			break;
		}
	}

	// Perform the SSL shutdown 
	stream.shutdown(ec);
	if (ec)
	{
		std::cerr << "Lines 669 and 670:\n";
		return fail(ec, "shutdown");
	}

	// At this point the connection is closed gracefully
}


// This function queries the currency API after making sure
// that the stored result(s) is/are old enough
// It also makes a new query to the API if needed
const json &cache_storage::query_rate(std::string_view query_data, std::string_view currencykey, 
	const json &sentry)
{
	using namespace std::string_literals;
	auto found{ m_cache_conv.find(std::string(query_data)) };
	boost::beast::error_code ec;
	try
	{
		if (found == m_cache_conv.end() || (std::chrono::steady_clock::now() - found->second.first) > m_duration)
		{
			auto host{ "openexchangerates.org"s }, api_endpoint{ "/api/latest.json"s };
			std::string currency_to{ query_data };
			auto target{ api_endpoint + "?app_id="s + std::string(currencykey) + "&symbols="s + currency_to };
			auto port{ "443"s };
			int version{ 11 };

			// The io_context is required for all IO
			boost::asio::io_context ioc;

			// The SSL context is required, and holds certificates
			ssl::context ctx{ ssl::context::tlsv12_client };

			// These objects perform our IO
			tcp::resolver resolver{ ioc };
			ssl::stream<tcp::socket> stream{ ioc, ctx };

			// Set SNI Hostname (many hosts need this to handshake successfully)
			if (!SSL_set_tlsext_host_name(stream.native_handle(), host.c_str()))
			{
				boost::system::error_code ec{ static_cast<int>(::ERR_get_error()), boost::asio::error::get_ssl_category() };
				throw boost::system::system_error{ ec };
			}

			// Look up the domain name
			const auto results = resolver.resolve(host, port);

			// This holds the root certificate used for verification
			load_root_certificates(ctx);

			// Verify the remote server's certificate
			ctx.set_verify_mode(ssl::verify_peer);

			// Make the connection on the IP address we get from a lookup
			boost::asio::connect(stream.next_layer(), results.begin(), results.end());

			// Perform the SSL handshake
			stream.handshake(ssl::stream_base::client, ec);
			if (ec)
			{
				std::cerr << "Lines 729 and 730:\n";
				fail(ec, "handshake");
			}

			// Set up an HTTP GET request message
			http::request<http::string_body> req{ http::verb::get, target, version };
			req.set(http::field::host, host);
			req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);

			// Send the HTTP request to the remote host
			http::write(stream, req);

			// This buffer is used for reading and must be persisted
			boost::beast::flat_buffer buffer;

			// Declare a container to hold the response
			http::response<http::string_body> res;

			// Receive the HTTP response
			http::read(stream, buffer, res);
			found = m_cache_conv.insert_or_assign(found, query_data, std::make_pair(std::chrono::steady_clock::now(),
				json::parse(res.body())["rates"][currency_to].get<double>()));

			// Gracefully close the stream
			boost::system::error_code ec;
			stream.shutdown(ec);
			if (ec == boost::asio::error::eof)
			{
				// Rationale:
				// http://stackoverflow.com/questions/25587403/boost-asio-ssl-async-shutdown-always-finishes-with-an-error
				ec.assign(0, ec.category());
			}
			if (ec)
			{
				throw boost::system::system_error{ ec };
			}

			// If we get here then the connection is closed gracefully
		}
		return found->second.second;
	}
	catch (const std::exception &e)
	{
		std::cerr << "Line 772: Error: " << e.what() << '\n';
	}
	return sentry;
}

const json &cache_storage::query_list(std::string_view mapkey, std::string_view currencykey, const json &sentry) 
{
	using namespace std::string_literals;
	auto found{ m_cache_list.find(std::string(mapkey)) };
	boost::beast::error_code ec;
	try
	{
		if (found == m_cache_list.end() || (std::chrono::steady_clock::now() - found->second.first) > m_duration)
		{
			auto host{ "openexchangerates.org"s }, api_endpoint{ "/api/currencies.json"s };
			auto target{ api_endpoint + "?app_id="s + std::string{ currencykey } };
			std::string port{ "443" };
			int version{ 11 };

			// The io_context is required for all IO
			boost::asio::io_context ioc;

			// The SSL context is required, and holds certificates
			ssl::context ctx{ ssl::context::tlsv12_client };

			// These objects perform our IO
			tcp::resolver resolver{ ioc };
			ssl::stream<tcp::socket> stream{ ioc, ctx };

			// Set SNI Hostname (many hosts need this to handshake successfully)
			if (!SSL_set_tlsext_host_name(stream.native_handle(), host.c_str()))
			{
				boost::system::error_code ec{ static_cast<int>(::ERR_get_error()), boost::asio::error::get_ssl_category() };
				throw boost::system::system_error{ ec };
			}

			// Look up the domain name
			const auto results{ resolver.resolve(host, port) };

			// This holds the root certificate used for verification
			load_root_certificates(ctx);

			// Verify the remote server's certificate
			ctx.set_verify_mode(ssl::verify_peer);

			// Make the connection on the IP address we get from a lookup
			boost::asio::connect(stream.next_layer(), results.begin(), results.end());

			// Perform the SSL handshake
			stream.handshake(ssl::stream_base::client, ec);
			if (ec)
			{
				std::cerr << "Lines 824 and 825:\n";
				fail(ec, "handshake");
			}

			// Set up an HTTP GET request message
			http::request<http::string_body> req{ http::verb::get, target, version };
			req.set(http::field::host, host);
			req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);

			// Send the HTTP request to the remote host
			http::write(stream, req);

			// This buffer is used for reading and must be persisted
			boost::beast::flat_buffer buffer;

			// Declare a container to hold the response
			http::response<http::string_body> res;

			// Receive the HTTP response
			http::read(stream, buffer, res);
			found = m_cache_list.insert_or_assign(found, std::string(mapkey), 
				std::make_pair(std::chrono::steady_clock::now(), res.body()));

			// Gracefully close the stream
			boost::system::error_code ec;
			stream.shutdown(ec);
			if (ec == boost::asio::error::eof)
			{
				// Rationale:
				// http://stackoverflow.com/questions/25587403/boost-asio-ssl-async-shutdown-always-finishes-with-an-error
				ec.assign(0, ec.category());
			}
			if (ec)
			{
				throw boost::system::system_error{ ec };
			}

			// If we get here then the connection is closed gracefully
		}
		return found->second.second;
	}
	catch (const std::exception& e)
	{
		std::cerr << "Line 867: Error: " << e.what() << std::endl;
	}
	return sentry;
}

// Performs currency conversion calculation
double calc_result(const double money_amount, const double conversion_rate)
{
	double result{ money_amount * conversion_rate };
	return result;
}