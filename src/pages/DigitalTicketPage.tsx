import { useEffect, useState } from 'react';
import { ArrowLeft, Bus, Download, ShieldCheck } from 'lucide-react';
import { cgiApi } from '../api/cgiClient';
import type { BusPassRecord } from '../types';
import { DigitalBusPassCard } from '../components/DigitalBusPassCard';
import { generateDigitalTicketImage } from '../lib/ticketImageGenerator';

interface DigitalTicketPageProps {
  initialPass: BusPassRecord;
  onBackPortal: () => void;
}

export function DigitalTicketPage({ initialPass, onBackPortal }: DigitalTicketPageProps) {
  const [pass, setPass] = useState<BusPassRecord>(initialPass);
  const [ticketPhoto, setTicketPhoto] = useState<string>(initialPass.ticketPhoto || '');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let active = true;
    cgiApi
      .verifyTicket(initialPass.applicationID, initialPass.studentID)
      .then(async (live) => {
        if (!active) return;
        const targetPass = live || initialPass;
        setPass(targetPass);

        if (targetPass.ticketPhoto) {
          setTicketPhoto(targetPass.ticketPhoto);
        } else if (targetPass.status === 'Approved') {
          const generated = await generateDigitalTicketImage(targetPass);
          if (active && generated) {
            setTicketPhoto(generated);
            cgiApi.saveTicketPhoto(targetPass, generated).catch(() => {});
          }
        }
      })
      .catch(() => {
        // Keep initialPass from QR URL if offline
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => {
      active = false;
    };
  }, [initialPass]);

  const handleDownloadPhoto = async () => {
    let img = ticketPhoto;
    if (!img) {
      img = await generateDigitalTicketImage(pass);
      if (img) {
        setTicketPhoto(img);
        cgiApi.saveTicketPhoto(pass, img).catch(() => {});
      }
    }
    if (!img) return;
    const link = document.createElement('a');
    link.href = img;
    link.download = `SRMAP-BusPass-${pass.studentID || pass.applicationID}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EB6B2C] text-white">
              <Bus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold tracking-tight text-[#111C35] leading-none">
                BUSPASS
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                SRM UNIVERSITY AP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackPortal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#111C35] hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Portal</span>
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-base font-bold text-[#111C35]">
                Verified Digital Bus Pass Ticket
              </h1>
              <p className="text-xs text-slate-600">
                {verifying
                  ? 'Loading verified ticket photo from database...'
                  : 'Official SRM University AP digital bus pass verification view.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-semibold text-slate-500">
              Pass #{pass.applicationID}
            </span>
            {ticketPhoto && (
              <button
                type="button"
                onClick={handleDownloadPhoto}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download Ticket Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Digital Ticket Photo Image */}
        {ticketPhoto && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Official Digital Ticket Image
              </p>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 font-semibold">
                {pass.status}
              </span>
            </div>
            <img
              src={ticketPhoto}
              alt={`SRM AP Digital Bus Pass Ticket #${pass.applicationID}`}
              className="w-full h-auto rounded-xl border border-slate-100"
            />
          </div>
        )}

        <DigitalBusPassCard pass={pass} />
      </main>
    </div>
  );
}
