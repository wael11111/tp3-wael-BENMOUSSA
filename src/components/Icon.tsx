import {
  Camera,
  ChefHat,
  Clock,
  FileText,
  Folder,
  Heart,
  HelpCircle,
  Plane,
  Quote,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Camera,
  ChefHat,
  Clock,
  FileText,
  Folder,
  Heart,
  HelpCircle,
  Plane,
  Quote,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
};

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, ...rest }: IconProps) {
  const Component = ICONS[name] ?? Folder;
  return <Component {...rest} />;
}
