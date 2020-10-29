#ifndef SERVER_CERTIFICATE_H
#define SERVER_CERTIFICATE_H

#include <boost/asio/buffer.hpp>
#include <boost/asio/ssl/context.hpp>
#include <fstream>

#pragma comment(lib, "crypt32.lib")

/*
	Load a signed certificate into the ssl context, and configure
	the context for use with a server.
*/
inline void load_server_certificate(boost::asio::ssl::context& ctx)
{
	const std::string cert_filename = "C:/Users/Osman/.acme.sh/dragonosman.dynu.net/fullchain.cer";
	
	ctx.use_certificate_file(cert_filename, boost::asio::ssl::context_base::file_format::pem);

	const std::string dh =
		"-----BEGIN DH PARAMETERS-----\n"
		"MIIBCAKCAQEA//////////+t+FRYortKmq/cViAnPTzx2LnFg84tNpWp4TZBFGQz\n"
		"+8yTnc4kmz75fS/jY2MMddj2gbICrsRhetPfHtXV/WVhJDP1H18GbtCFY2VVPe0a\n"
		"87VXE15/V8k1mE8McODmi3fipona8+/och3xWKE2rec1MKzKT0g6eXq8CrGCsyT7\n"
		"YdEIqUuyyOP7uWrat2DX9GgdT0Kj3jlN9K5W7edjcrsZCwenyO4KbXCeAvzhzffi\n"
		"7MA0BM0oNC9hkXL+nOmFg/+OTxIy7vKBg8P+OxtMb61zO7X8vC7CIAXFjvGDfRaD\n"
		"ssbzSibBsu/6iGtCOGEoXJf//////////wIBAg==\n"
		"-----END DH PARAMETERS-----\n";

	ctx.set_password_callback(
		[](std::size_t, boost::asio::ssl::context::password_purpose)
		{
			return "test";
		});

	ctx.set_options(boost::asio::ssl::context::default_workarounds |
		boost::asio::ssl::context::no_sslv2 |
		boost::asio::ssl::context::single_dh_use);

	const std::string key_filename = "C:/Users/Osman/.acme.sh/dragonosman.dynu.net/dragonosman.dynu.net.key";
	std::ifstream ifs2{ key_filename };
	std::string key{ (std::istreambuf_iterator<char>(ifs2)),
					 (std::istreambuf_iterator<char>()) };

	ctx.use_rsa_private_key(boost::asio::buffer(key.data(), key.size()), boost::asio::ssl::context::file_format::pem);

	ctx.use_tmp_dh(boost::asio::buffer(dh.data(), dh.size()));
}

#endif