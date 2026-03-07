import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  glowColor?: string;
}

export function NeonButton({ className, variant = 'primary', glowColor, children, ...props }: NeonButtonProps) {
  const baseClasses = "relative overflow-hidden rounded-md px-6 py-2 transition-all duration-300 transform active:scale-95 group";
  
  const variants = {
    primary: "bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF]/20 hover:border-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.6)]",
    secondary: "bg-[#8A2BE2]/10 text-[#8A2BE2] border border-[#8A2BE2]/50 hover:bg-[#8A2BE2]/20 hover:border-[#8A2BE2] hover:shadow-[0_0_15px_rgba(138,43,226,0.6)]",
    danger: "bg-[#FF00FF]/10 text-[#FF00FF] border border-[#FF00FF]/50 hover:bg-[#FF00FF]/20 hover:border-[#FF00FF] hover:shadow-[0_0_15px_rgba(255,0,255,0.6)]",
  };

  const dynamicShadow = glowColor ? `0 0 15px ${glowColor}80` : undefined;

  return (
    <button 
      className={cn(baseClasses, variants[variant], className)}
      style={glowColor ? {
        borderColor: glowColor,
        color: glowColor,
        boxShadow: props.disabled ? undefined : dynamicShadow,
      } : undefined}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[30deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
    </button>
  );
}
