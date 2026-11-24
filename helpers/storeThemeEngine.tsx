import type { StoreTheme } from "./schema";

type Appearance = {
  primaryColor?: unknown; accentColor?: unknown; backgroundColor?: unknown; backgroundImageUrl?: unknown;
  backgroundOverlay?: unknown; textColor?: unknown; mutedTextColor?: unknown; cardBackground?: unknown;
  buttonBackground?: unknown; buttonTextColor?: unknown; linkColor?: unknown; borderColor?: unknown;
  cardRadius?: unknown; cardShadow?: unknown; layout?: unknown; menuStyle?: unknown; menuVisibility?: unknown;
  fontFamily?: unknown; displayFontFamily?: unknown; bodyFontSize?: unknown; headingWeight?: unknown;
  headerLogo?: unknown; headerDescription?: unknown; headerActions?: unknown; headerAlignment?: unknown; headerBrand?: unknown; headerTagline?: unknown; menuPosition?: unknown; heroLayout?: unknown; siteMode?: unknown; siteType?: unknown;
};

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const rgb = (hex: string) => ({ r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) });
const contrastColor = (hex: string) => { const c=rgb(hex); const y=(.299*c.r+.587*c.g+.114*c.b)/255; return y>.58?"#171b18":"#ffffff"; };
const readableMuted = (hex: string) => { const c=rgb(hex); const y=(.299*c.r+.587*c.g+.114*c.b)/255; return y>.58?"#5f665f":"#d8ddd8"; };

export const DEFAULT_STORE_THEME = {
  backgroundColor:"#f7f4ec", primaryColor:"#0e5c3f", accentColor:"#d97706", textColor:"#17201a",
  mutedTextColor:"#626b64", cardBackground:"#fffdf7", buttonBackground:"#0e5c3f", buttonTextColor:"#ffffff",
  linkColor:"#0e5c3f", borderColor:"#d9d6cb", cardRadius:"10px", cardShadow:"0 2px 12px rgba(23,32,26,0.06)",
  fontFamily:"Inter Tight, sans-serif", displayFontFamily:"Bricolage Grotesque, sans-serif", bodyFontSize:"16px", headingWeight:"800",
} as const;

export const storeThemeEngine = (themeId: StoreTheme, appearance: Appearance) => {
  const layout = appearance.layout === "wide" || appearance.layout === "compact" ? appearance.layout : "standard";
  const menuStyle = appearance.menuStyle === "pills" || appearance.menuStyle === "minimal" ? appearance.menuStyle : "bar";
  const menuVisibility = appearance.menuVisibility === "always" ? "always" : "auto";
  const headerLogo = appearance.headerLogo !== false;
  const headerDescription = appearance.headerDescription !== false;
  const headerActions = appearance.headerActions !== false;
  const headerAlignment = appearance.headerAlignment === "center" ? "center" : "split";
  const headerBrand = appearance.headerBrand === "logo" || appearance.headerBrand === "name" || appearance.headerBrand === "logo_name" || appearance.headerBrand === "logo_name_tagline" || appearance.headerBrand === "name_tagline" ? appearance.headerBrand : "logo_name";
  const headerTagline = typeof appearance.headerTagline === "string" ? appearance.headerTagline : "";
  const menuPosition = appearance.menuPosition === "left" || appearance.menuPosition === "right" ? appearance.menuPosition : "center";
  const heroLayout = appearance.heroLayout === "full" || appearance.heroLayout === "left" || appearance.heroLayout === "right" || appearance.heroLayout === "text" ? appearance.heroLayout : "right";
  const siteMode = appearance.siteMode === "multi_page" ? "multi_page" : "one_page";
  const siteType = appearance.siteType === "online_store" || appearance.siteType === "service_business" || appearance.siteType === "portfolio" || appearance.siteType === "events_community" ? appearance.siteType : "custom";
  const backgroundColor = isHex(appearance.backgroundColor) ? appearance.backgroundColor : DEFAULT_STORE_THEME.backgroundColor;
  const primary = isHex(appearance.primaryColor) ? appearance.primaryColor : DEFAULT_STORE_THEME.primaryColor;
  const accent = isHex(appearance.accentColor) ? appearance.accentColor : DEFAULT_STORE_THEME.accentColor;
  const textColor = isHex(appearance.textColor) ? appearance.textColor : contrastColor(backgroundColor);
  const mutedTextColor = isHex(appearance.mutedTextColor) ? appearance.mutedTextColor : readableMuted(backgroundColor);
  const cardBackground = isHex(appearance.cardBackground) ? appearance.cardBackground : DEFAULT_STORE_THEME.cardBackground;
  const buttonBackground = isHex(appearance.buttonBackground) ? appearance.buttonBackground : primary;
  const buttonTextColor = isHex(appearance.buttonTextColor) ? appearance.buttonTextColor : contrastColor(buttonBackground);
  const linkColor = isHex(appearance.linkColor) ? appearance.linkColor : primary;
  const borderColor = isHex(appearance.borderColor) ? appearance.borderColor : DEFAULT_STORE_THEME.borderColor;
  const headerTextColor = contrastColor(primary);
  const headerMutedColor = readableMuted(primary);
  const backgroundImageUrl = typeof appearance.backgroundImageUrl === "string" ? appearance.backgroundImageUrl : "";
  const overlay = typeof appearance.backgroundOverlay === "number" ? Math.max(0, Math.min(.8, appearance.backgroundOverlay/100)) : 0;
  const style: Record<string,string> = {
    "--store-primary":primary,"--store-accent":accent,"--primary":primary,"--accent":accent,
    "--background":backgroundColor,"--foreground":textColor,"--muted-foreground":mutedTextColor,
    "--card":cardBackground,"--card-foreground":textColor,"--surface":cardBackground,
    "--primary-foreground":buttonTextColor,"--secondary":accent,"--border":borderColor,
    "--store-link":linkColor,"--store-button":buttonBackground,"--store-button-text":buttonTextColor,
    "--store-card-radius":typeof appearance.cardRadius==="string"?appearance.cardRadius:DEFAULT_STORE_THEME.cardRadius,
    "--store-card-shadow":typeof appearance.cardShadow==="string"?appearance.cardShadow:DEFAULT_STORE_THEME.cardShadow,
    "--store-font-family":typeof appearance.fontFamily==="string"?appearance.fontFamily:DEFAULT_STORE_THEME.fontFamily,
    "--store-display-font":typeof appearance.displayFontFamily==="string"?appearance.displayFontFamily:DEFAULT_STORE_THEME.displayFontFamily,
    "--store-body-size":typeof appearance.bodyFontSize==="string"?appearance.bodyFontSize:DEFAULT_STORE_THEME.bodyFontSize,
    "--store-heading-weight":typeof appearance.headingWeight==="string"?appearance.headingWeight:DEFAULT_STORE_THEME.headingWeight,
    "--store-header-text":headerTextColor,"--store-header-muted":headerMutedColor,
    "--store-header-bg":primary,
    "--font-family-base":typeof appearance.fontFamily==="string"?appearance.fontFamily:DEFAULT_STORE_THEME.fontFamily,
    "--font-family-display":typeof appearance.displayFontFamily==="string"?appearance.displayFontFamily:DEFAULT_STORE_THEME.displayFontFamily,
    "--font-family-monospace":"IBM Plex Mono, ui-monospace, monospace",
    "--store-header-height":"auto",
    backgroundColor,color:textColor,
    fontFamily:typeof appearance.fontFamily==="string"?appearance.fontFamily:DEFAULT_STORE_THEME.fontFamily,
    fontSize:typeof appearance.bodyFontSize==="string"?appearance.bodyFontSize:DEFAULT_STORE_THEME.bodyFontSize,
  };
  if (backgroundImageUrl) {
    style.backgroundImage = "linear-gradient(rgba(0,0,0,"+overlay+"), rgba(0,0,0,"+overlay+")), url(\""+backgroundImageUrl+"\")";
    style.backgroundSize="cover"; style.backgroundPosition="center"; style.backgroundAttachment="scroll";
  }
  return { themeClass:"theme_"+themeId, layoutClass:"layout_"+layout, menuStyle, menuVisibility, headerLogo, headerDescription, headerActions, headerAlignment, headerBrand, headerTagline, menuPosition, heroLayout, siteMode, siteType, style };
};

