import { useEffect, useState } from 'react';
import { Bus, Download, ExternalLink, Printer, QrCode, X } from 'lucide-react';
import type { BusPassRecord } from '../types';
import { QrCodeSvg } from './QrCodeSvg';
import { StatusLabel } from './StatusLabel';
import {
  buildTicketUrl,
  generateDigitalTicketImage,
} from '../lib/ticketImageGenerator';
import { cgiApi } from '../api/cgiClient';

export { buildTicketUrl };

interface DigitalBusPassCardProps {
  pass: BusPassRecord;
  showPrintButton?: boolean;
}

export function DigitalBusPassCard({
  pass,
  showPrintButton = true,
}: DigitalBusPassCardProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [ticketPhoto, setTicketPhoto] = useState<string>(pass.ticketPhoto || '');

  const isApproved = pass.status === 'Approved';
  const ticketUrl = buildTicketUrl(pass);

  const routeDisplay = pass.route?.trim() || 'Not Assigned';
  const boardingDisplay = pass.boardingPoint?.trim() || 'Not Assigned';
  const passTypeDisplay = pass.passType?.trim() || 'Not Assigned';
  const validityDisplay = pass.validity?.trim() || 'Not Assigned';

  useEffect(() => {
    let active = true;
    if (isApproved) {
      if (pass.ticketPhoto) {
        setTicketPhoto(pass.ticketPhoto);
      } else {
        generateDigitalTicketImage(pass)
          .then((img) => {
            if (!active || !img) return;
            setTicketPhoto(img);
            cgiApi.saveTicketPhoto(pass, img).catch(() => {});
          })
          .catch(() => {});
      }
    }
    return () => {
      active = false;
    };
  }, [
    isApproved,
    pass.applicationID,
    pass.studentID,
    pass.name,
    pass.department,
    pass.route,
    pass.boardingPoint,
    pass.passType,
    pass.validity,
    pass.status,
    pass.ticketPhoto,
  ]);

  const handleDownloadTicketPhoto = async () => {
    let imgUrl = ticketPhoto;
    if (!imgUrl) {
      imgUrl = await generateDigitalTicketImage(pass);
      if (imgUrl) {
        setTicketPhoto(imgUrl);
        cgiApi.saveTicketPhoto(pass, imgUrl).catch(() => {});
      }
    }
    if (!imgUrl) return;
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `SRMAP-BusPass-${pass.studentID || pass.applicationID}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        id="printable-bus-pass"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        {/* Top Navy Header Strip */}
        <div className="flex items-center justify-between bg-[#111C35] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EB6B2C] text-white shrink-0">
              <Bus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-sm font-bold tracking-wide whitespace-nowrap">
                BUSPASS DIGITAL TRANSIT CARD
              </p>
              <p className="text-[11px] font-medium tracking-wider text-slate-300 uppercase">
                SRM UNIVERSITY AP
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-300">Application ID</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              #{pass.applicationID}
            </p>
          </div>
        </div>

        {/* Main Pass Content */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            {/* Student Identity */}
            <div className="space-y-3 flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl font-bold text-[#111C35]">
                  {pass.name}
                </h3>
                <StatusLabel status={pass.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>
                  Student ID:{' '}
                  <strong className="font-mono text-[#111C35] tabular-nums text-sm">
                    {pass.studentID}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Department: <strong className="text-[#111C35]">{pass.department}</strong>
                </span>
              </div>

              <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-slate-100">
                <div className="rounded-lg bg-[#F8FAFC] p-2.5 border border-slate-100">
                  <span className="block text-[11px] text-slate-500">Route Number</span>
                  <span className="mt-0.5 block font-mono font-bold text-[#2563EB] text-sm tabular-nums">
                    {routeDisplay}
                  </span>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-2.5 border border-slate-100">
                  <span className="block text-[11px] text-slate-500">Boarding Point</span>
                  <span className="mt-0.5 block font-semibold text-[#111C35] text-sm">
                    {boardingDisplay}
                  </span>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-2.5 border border-slate-100">
                  <span className="block text-[11px] text-slate-500">Pass Type</span>
                  <span className="mt-0.5 block font-semibold text-[#111C35] text-sm">
                    {passTypeDisplay}
                  </span>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-2.5 border border-slate-100">
                  <span className="block text-[11px] text-slate-500">Valid Until</span>
                  <span className="mt-0.5 block font-mono font-bold text-[#111C35] text-sm tabular-nums">
                    {validityDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Verification Block */}
            <div className="flex flex-col items-center gap-2 self-center md:self-start shrink-0">
              {isApproved ? (
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="group flex flex-col items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Scan QR or click to view digital ticket photo"
                >
                  <QrCodeSvg payload={ticketUrl} size={132} />
                  <span className="mt-2 block text-[11px] font-semibold text-[#2563EB] group-hover:underline whitespace-nowrap">
                    Scan or Tap for Ticket Photo
                  </span>
                </button>
              ) : (
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[11px] text-slate-500">
                  QR issued upon approval
                </div>
              )}
            </div>
          </div>

          {/* Bottom Notice / Print & Download Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
            <p className="text-slate-500">
              {isApproved
                ? 'Valid for boarding SRM University AP shuttle buses along the assigned route.'
                : 'This pass is not active for boarding until approved by the Transport Administrator.'}
            </p>
            {showPrintButton && isApproved && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTicketPhoto}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download Ticket Photo
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111C35] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  Print Bus Pass
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive QR Scan Browser Ticket Photo Viewer Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between bg-[#111C35] px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#EB6B2C]" />
                <h3 className="font-display text-sm font-bold">
                  Digital Bus Pass Ticket Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Close ticket modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-center">
              {ticketPhoto ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={ticketPhoto}
                    alt={`Digital Bus Pass Ticket #${pass.applicationID}`}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              ) : (
                <div className="mx-auto inline-block rounded-2xl border border-slate-200 p-3 bg-slate-50">
                  <QrCodeSvg payload={ticketUrl} size={184} />
                </div>
              )}

              <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                <QrCodeSvg payload={ticketUrl} size={88} />
                <div className="text-left text-xs space-y-1">
                  <p className="font-bold text-[#111C35]">
                    Scan QR on any phone to view this ticket photo
                  </p>
                  <p className="text-slate-600">
                    Pass <span className="font-mono font-semibold">#{pass.applicationID}</span> ·{' '}
                    <span className="font-mono font-semibold text-[#2563EB]">{routeDisplay}</span>
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-2.5">
                <a
                  href={ticketUrl}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Open Ticket Page
                </a>
                <button
                  type="button"
                  onClick={handleDownloadTicketPhoto}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
