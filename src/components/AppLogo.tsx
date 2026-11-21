export const APP_LOGO_SRC =
  '/assets/aistudio/Gemini_Generated_Image_ujd0k6ujd0k6ujd0_e4a283ea.png';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className = 'h-9 w-9' }: AppLogoProps) {
  return (
    <span
      className={`inline-flex ${className} items-center justify-center rounded-lg bg-white p-0.5 border border-slate-200/80 overflow-hidden shrink-0`}
    >
      <img
        src={APP_LOGO_SRC}
        alt="BUSPASS Logo"
        className="h-full w-full object-contain scale-125"
      />
    </span>
  );
}
