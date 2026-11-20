import { Bus, Building2, Mail, Phone, Clock, ChevronRight } from 'lucide-react';

interface PublicHomePageProps {
  onNavigateAuth: (mode: 'student-login' | 'student-register') => void;
}

const UPLOADED_BUS_PHOTO = '/assets/aistudio/image_5d86c06a.png';

export function PublicHomePage({ onNavigateAuth }: PublicHomePageProps) {
  return (
    <div className="min-h-screen bg-white text-[#111C35] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-4">
          <a
            href="#home"
            className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-[#111C35] whitespace-nowrap shrink-0"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#111C35]">
              <Bus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>BUSPASS</span>
          </a>

          <div className="flex items-center gap-7 shrink-0">
            <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-600">
              <a
                href="#home"
                className="hover:text-[#111C35] transition-colors whitespace-nowrap shrink-0"
              >
                Home
              </a>
              <a
                href="#contact"
                className="hover:text-[#111C35] transition-colors whitespace-nowrap shrink-0"
              >
                Contact
              </a>
            </nav>

            <button
              type="button"
              onClick={() => onNavigateAuth('student-login')}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column */}
              <div className="lg:col-span-6 flex flex-col items-start">
                <div className="mb-4">
                  <p className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
                    SRM UNIVERSITY AP
                  </p>
                  <div className="mt-1.5 h-0.5 w-8 rounded-full bg-[#EB6B2C]" />
                </div>

                <h1 className="font-display text-[clamp(2.25rem,4vw,3.35rem)] font-extrabold leading-[1.12] tracking-tight text-[#111C35] [text-wrap:balance]">
                  Bus Pass Registration &amp; Management System
                </h1>

                <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-slate-600">
                  Register with your university Student ID, apply for a campus shuttle route, and
                  access your approved QR digital bus pass.
                </p>

                <button
                  type="button"
                  onClick={() => onNavigateAuth('student-register')}
                  className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#EB6B2C] pl-6 pr-3 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:bg-[#D95B1E] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Apply for Bus Pass</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              </div>

              {/* Right Column: Borderless SRM Bus Photograph */}
              <div className="lg:col-span-6">
                <div className="overflow-hidden rounded-2xl shadow-sm">
                  <img
                    src={UPLOADED_BUS_PHOTO}
                    alt="SRM University AP campus shuttle buses"
                    referrerPolicy="no-referrer"
                    className="w-full h-64 sm:h-80 object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Us Strip */}
        <section id="contact" className="pb-12 pt-4 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-3 flex flex-col justify-center pr-2">
                  <h2 className="font-display text-base font-bold text-[#111C35]">
                    Contact Us
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    SRM University – AP, Neerukonda, Mangalagiri – 522240.
                  </p>
                </div>

                {/* Card 1: Office Location */}
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#111C35]">Office Location</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Transport Desk, Admin Block, SRM University – AP, Neerukonda, Mangalagiri – 522240.
                    </p>
                  </div>
                </div>

                {/* Card 2: Email & Phone */}
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#111C35]">Email</p>
                      <p className="text-xs text-slate-600 truncate">office@srmap.edu.in</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-xs font-mono text-slate-700 tabular-nums">
                      +91-863-2343000
                    </p>
                  </div>
                </div>

                {/* Card 3: Office Hours */}
                <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#111C35]">Office Hours</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Monday – Saturday : 09:00 AM – 05:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-100 bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SRM UNIVERSITY AP — BUSPASS Management System.</p>
          <button
            type="button"
            onClick={() => onNavigateAuth('student-login')}
            className="font-medium text-slate-600 hover:text-[#111C35] cursor-pointer"
          >
            Portal Login
          </button>
        </div>
      </footer>
    </div>
  );
}
