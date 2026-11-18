import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaYoutube } from 'react-icons/fa';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAGEJKtg-gLyM88ox';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!window.__turnstilePromise) {
    window.__turnstilePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        window.__turnstilePromise = null;
        reject(new Error('Turnstile indisponible'));
      };
      document.head.appendChild(script);
    });
  }
  return window.__turnstilePromise;
};

const emptyForm = { email: '', message: '', website: '' };

const ContactForm = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [token, setToken] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const widgetRef = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetRef.current || widgetId.current !== null) return;
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'fr',
          callback: (t) => setToken(t),
          'expired-callback': () => setToken(''),
          'error-callback': (code) => {
            setToken('');
            setStatus({ type: 'error', text: `La vérification anti-robot a échoué (code ${code}). Désactivez le bloqueur de pub / VPN du navigateur, puis rechargez la page.` });
            return true;
          },
        });
      })
      .catch(() => setStatus({ type: 'error', text: 'La vérification anti-robot ne se charge pas. Rechargez la page.' }));
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  const resetWidget = () => {
    setToken('');
    if (widgetId.current !== null && window.turnstile) window.turnstile.reset(widgetId.current);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!formData.email || !formData.message) {
      setStatus({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    if (!token) {
      setStatus({ type: 'error', text: 'Veuillez patienter pendant la vérification anti-robot.' });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...formData, token }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        setStatus({ type: 'success', text: 'Message envoyé avec succès ! Nous vous recontacterons bientôt.' });
        setFormData(emptyForm);
      } else {
        setStatus({ type: 'error', text: result.error || `Une erreur est survenue (HTTP ${response.status}). Veuillez réessayer plus tard.` });
      }
    } catch (err) {
      setStatus({ type: 'error', text: `Une erreur est survenue (réseau : ${err && err.message ? err.message : 'inconnu'}). Veuillez réessayer plus tard.` });
    } finally {
      setSending(false);
      resetWidget();
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-blue-900 mb-4">Contactez-nous</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Vous avez des questions ou souhaitez discuter d'un projet ? Nous serions ravis d'échanger avec vous.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-lg"
          >
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Envoyez-nous un message</h3>
            <form 
              onSubmit={handleSubmit} 
              className="space-y-5 relative"
            >
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label htmlFor="website">Ne pas remplir</label>
                <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" value={formData.website} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Votre adresse email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Votre message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                ></textarea>
              </div>
              <div ref={widgetRef} className="min-h-[65px]" />
              {status && (
                <p
                  role="status"
                  className={`text-sm rounded-lg px-4 py-3 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}
                >
                  {status.text}
                </p>
              )}
              <motion.button
                type="submit"
                disabled={sending || !token}
                className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-xl shadow-lg h-full">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Coordonnées</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                    <MapPinIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-800">Notre adresse</h4>
                    <p className="mt-1 text-gray-600">
                      Liberté 6 Extension Camp Pénal<br />
                      Dakar, Sénégal
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                    <PhoneIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-800">Téléphone</h4>
                    <div className="mt-1 space-y-1">
                      <p className="text-gray-600">
                        <a href="tel:+221338671855" className="hover:text-blue-600 transition-colors">+221 33 867 18 55</a>
                      </p>
                      <p className="text-gray-600">
                        <a href="tel:+221774503939" className="hover:text-blue-600 transition-colors">+221 77 450 39 39</a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-800">Horaires d'ouverture</h4>
                    <p className="mt-1 text-gray-600">
                      Lundi - Vendredi : 08h00 - 17h00
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 hidden">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Suivez-nous</h4>
                <div className="flex space-x-4">
                  <a href="#" className="bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <FaFacebook className="h-5 w-5" />
                  </a>
                  <a href="#" className="bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <FaTwitter className="h-5 w-5" />
                  </a>
                  <a href="#" className="bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <FaLinkedin className="h-5 w-5" />
                  </a>
                  <a href="#" className="bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <FaInstagram className="h-5 w-5" />
                  </a>
                  <a href="#" className="bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <FaYoutube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
