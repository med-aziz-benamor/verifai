import { cn } from "@/lib/utils";

interface BrandLogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
}

const BrandLogo = ({
  alt = "Verifai logo",
  className,
  imageClassName,
}: BrandLogoProps) => (
  <span className={cn("inline-flex items-center", className)}>
    <img
      src="/verifai-logo-light.png"
      alt={alt}
      className={cn("block h-10 w-auto dark:hidden", imageClassName)}
    />
    <img
      src="/verifai-logo-dark.png"
      alt={alt}
      className={cn("hidden h-10 w-auto dark:block", imageClassName)}
    />
  </span>
);

export default BrandLogo;
