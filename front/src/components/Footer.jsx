import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

const footerLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Instagram', href: '/#instagram', icon: 'Instagram' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-b from-stone-50 dark:from-[#161616] to-stone-100 dark:to-[#111] border-t border-stone-200/60 dark:border-white/5 transition-colors duration-300">
      <motion.div
        className="max-w-screen-xl mx-auto flex flex-col items-center gap-2 pt-7 pb-5 px-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xl font-semibold text-[#282828] dark:text-white">
          Out<span className="text-[#f9a825]">Zone</span>
        </span>
        <span className="text-xs font-light text-stone-400 dark:text-white/30 tracking-wide">
          outzone-recommender
        </span>
        <nav className="flex items-center gap-6 mt-1">
          {footerLinks.map(link => {
            const Icon = link.icon ? Icons[link.icon] || Icons['HelpCircle'] : null;
            return (
              <motion.a key={link.label} href={link.href}
                className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 dark:text-white/40 hover:text-[#664613] dark:hover:text-[#f9a825] transition-colors"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </motion.a>
            );
          })}
        </nav>
        <p className="text-xs font-light text-stone-300 dark:text-white/20 mt-1">
          Discover Cairo, one venue at a time.
        </p>
      </motion.div>
    </footer>
  );
}
