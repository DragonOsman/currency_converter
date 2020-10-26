#ifndef ROOT_CERTIFICATE_H
#define ROOT_CERTIFICATE_H

#include <boost/asio/ssl.hpp>
#include <wincrypt.h>
#include <iostream>
#include <string>

namespace ssl = boost::asio::ssl; // from <boost/asio/ssl.hpp>

namespace detail
{
	// The template argument is gratuituous, to
	// allow the implementation to be header-only.
	//
	template<class = void>
	void load_root_certificates(ssl::context &ctx, boost::system::error_code &ec)
	{
		PCCERT_CONTEXT pcert_context = nullptr;
		const char *pzstore_name = "ROOT";

		// Try to open root certificate store
		// If it succeeds, it'll return a handle to the certificate store
		// If it fails, it'll return NULL
		auto hstore_handle = CertOpenSystemStoreA(NULL, pzstore_name);
		char *data = nullptr;
		std::string certificates;
		X509 *x509 = nullptr;
		BIO *bio = nullptr;
		if (hstore_handle != nullptr)
		{
			// Extract the certificates from the store in a loop
			while ((pcert_context = CertEnumCertificatesInStore(hstore_handle, pcert_context)) != NULL)
			{
				x509 = d2i_X509(nullptr, const_cast<const BYTE**>(&pcert_context->pbCertEncoded), pcert_context->cbCertEncoded);
				bio = BIO_new(BIO_s_mem());
				if (PEM_write_bio_X509(bio, x509)) 
				{
					auto len = BIO_get_mem_data(bio, &data);
					if (certificates.size() == 0)
					{
						certificates = { data, static_cast<std::size_t>(len) };
						ctx.add_certificate_authority(boost::asio::buffer(certificates.data(), certificates.size()), ec);
						if (ec)
						{
							BIO_free(bio);
							X509_free(x509);
							CertCloseStore(hstore_handle, 0);
							return;
						}
					}
					else
					{
						certificates.append(data, static_cast<std::size_t>(len));
						ctx.add_certificate_authority(boost::asio::buffer(certificates.data(), certificates.size()), ec);
						if (ec)
						{
							BIO_free(bio);
							X509_free(x509);
							CertCloseStore(hstore_handle, 0);
							return;
						}
					}
				}
				BIO_free(bio);
				X509_free(x509);
			}
			CertCloseStore(hstore_handle, 0);
		}
		const std::string certs{ certificates };
	}
}

// Load the certificate into an SSL context
//
// This function is inline so that its easy to take
// the address and there's nothing weird like a
// gratuituous template argument; thus it appears
// like a "normal" function.
//

inline void load_root_certificates(ssl::context &ctx, boost::system::error_code &ec)
{
	detail::load_root_certificates(ctx, ec);
}

inline void load_root_certificates(ssl::context &ctx)
{
	boost::system::error_code ec;
	detail::load_root_certificates(ctx, ec);
	if (ec)
	{
		throw boost::system::system_error{ ec };
	}
}

#endif