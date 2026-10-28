import type { StoreTheme } from "./schema";

type Appearance = {
  primaryColor?: unknown; accentColor?: unknown; backgroundColor?: unknown; backgroundImageUrl?: unknown;
  backgroundOverlay?: unknown; textColor?: unknown; mutedTextColor?: unknown; cardBackground?: unknown;
  buttonBackground?: unknown; buttonTextColor?: unknown; linkColor?: unknown; borderColor?: unknown;
  cardRadius?: unknown; cardShadow?: unknown; layout?: unknown; menuStyle?: unknown; menuVisibility?: unknown;
  fontFamily?: unknown; displayFontFamily?: unknown; bodyFontSize?: unknown; headingWeight?: unknown;
  headerLogo?: unknown; headerDescription?: unknown; headerActions?: unknown; headerAlignment?: unknown; headerBrand?: unknown; headerTagline?: unknown; menuPosition?: unknown; heroLayout?: unknown; siteMode?: unknown;
   10	};
   11	
   12	const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
   13	const rgb = (hex: string) => ({ r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) });
   14	const contrastColor = (hex: string) => { const c=rgb(hex); const y=(.299*c.r+.587*c.g+.114*c.b)/255; return y>.58?"#171b18":"#ffffff"; };
   15	const readableMuted = (hex: string) => { const c=rgb(hex); const y=(.299*c.r+.587*c.g+.114*c.b)/255; return y>.58?"#5f665f":"#d8ddd8"; };
   16	
   17	export const DEFAULT_STORE_THEME = {
   18	  backgroundColor:"#f7f4ec", primaryColor:"#0e5c3f", accentColor:"#d97706", textColor:"#17201a",
   19	  mutedTextColor:"#626b64", cardBackground:"#fffdf7", buttonBackground:"#0e5c3f", buttonTextColor:"#ffffff",
   20	  linkColor:"#0e5c3f", borderColor:"#d9d6cb", cardRadius:"10px", cardShadow:"0 2px 12px rgba(23,32,26,0.06)",
   21	  fontFamily:"Inter Tight, sans-serif", displayFontFamily:"Bricolage Grotesque, sans-serif", bodyFontSize:"16px", headingWeight:"800",
   22	} as const;
   23	
   24	export const storeThemeEngine = (themeId: StoreTheme, appearance: Appearance) => {
   25	  const layout = appearance.layout === "wide" || appearance.layout === "compact" ? appearance.layout : "standard";
   26	  const menuStyle = appearance.menuStyle === "pills" || appearance.menuStyle === "minimal" ? appearance.menuStyle : "bar";
   27	  const menuVisibility = appearance.menuVisibility === "always" ? "always" : "auto";
   28	  const headerLogo = appearance.headerLogo !== false;
   29	  const headerDescription = appearance.headerDescription !== false;
   30	  const headerActions = appearance.headerActions !== false;
   31	  const headerAlignment = appearance.headerAlignment === "center" ? "center" : "split";
   32	  const headerBrand = appearance.headerBrand === "logo" || appearance.headerBrand === "name" || appearance.headerBrand === "logo_name" || appearance.headerBrand === "logo_name_tagline" || appearance.headerBrand === "name_tagline" ? appearance.headerBrand : "logo_name";
   33	  const headerTagline = typeof appearance.headerTagline === "string" ? appearance.headerTagline : "";
   34	  const menuPosition = appearance.menuPosition === "left" || appearance.menuPosition === "right" ? appearance.menuPosition : "center";
   35	  const heroLayout = appearance.heroLayout === "full" || appearance.heroLayout === "left" || appearance.heroLayout === "right" || appearance.heroLayout === "text" ? appearance.heroLayout : "right";
   36	  const siteMode = appearance.siteMode === "multi_page" ? "multi_page" : "one_page";
   37	  const backgroundColor = isHex(appearance.backgroundColor) ? appearance.backgroundColor : DEFAULT_STORE_THEME.backgroundColor;
   38	  const primary = isHex(appearance.primaryColor) ? appearance.primaryColor : DEFAULT_STORE_THEME.primaryColor;
   39	  const accent = isHex(appearance.accentColor) ? appearance.accentColor : DEFAULT_STORE_THEME.accentColor;
   40	  const textColor = isHex(appearance.textColor) ? appearance.textColor : contrastColor(backgroundColor);
   41	  const mutedTextColor = isHex(appearance.mutedTextColor) ? appearance.mutedTextColor : readableMuted(backgroundColor);
   42	  const cardBackground = isHex(appearance.cardBackground) ? appearance.cardBackground : DEFAULT_STORE_THEME.cardBackground;
   43	  const buttonBackground = isHex(appearance.buttonBackground) ? appearance.buttonBackground : primary;
   44	  const buttonTextColor = isHex(appearance.buttonTextColor) ? appearance.buttonTextColor : contrastColor(buttonBackground);
   45	  const linkColor = isHex(appearance.linkColor) ? appearance.linkColor : primary;
   46	  const borderColor = isHex(appearance.borderColor) ? appearance.borderColor : DEFAULT_STORE_THEME.borderColor;
   47	  const headerTextColor = contrastColor(primary);
   48	  const headerMutedColor = readableMuted(primary);
   49	  const backgroundImageUrl = typeof appearance.backgroundImageUrl === "string" ? appearance.backgroundImageUrl : "";
   50	  const overlay = typeof appearance.backgroundOverlay === "number" ? Math.max(0, Math.min(.8, appearance.backgroundOverlay/100)) : 0;
   51	  const style: Record<string,string> = {
   52	    "--store-primary":primary,"--store-accent":accent,"--primary":primary,"--accent":accent,
   53	    "--background":backgroundColor,"--foreground":textColor,"--muted-foreground":mutedTextColor,
   54	    "--card":cardBackground,"--card-foreground":textColor,"--surface":cardBackground,
   55	    "--primary-foreground":buttonTextColor,"--secondary":accent,"--border":borderColor,
   56	    "--store-link":linkColor,"--store-button":buttonBackground,"--store-button-text":buttonTextColor,
   57	    "--store-card-radius":typeof appearance.cardRadius==="string"?appearance.cardRadius:DEFAULT_STORE_THEME.cardRadius,
   58	    "--store-card-shadow":typeof appearance.cardShadow==="string"?appearance.cardShadow:DEFAULT_STORE_THEME.cardShadow,
   59	    "--store-font-family":typeof appearance.fontFamily==="string"?appearance.fontFamily:DEFAULT_STORE_THEME.fontFamily,
   60	    "--store-display-font":typeof appearance.displayFontFamily==="string"?appearance.displayFontFamily:DEFAULT_STORE_THEME.displayFontFamily,
   61	    "--store-body-size":typeof appearance.bodyFontSize==="string"?appearance.bodyFontSize:DEFAULT_STORE_THEME.bodyFontSize,
   62	    "--store-heading-weight":typeof appearance.headingWeight==="string"?appearance.headingWeight:DEFAULT_STORE_THEME.headingWeight,
   63	    "--store-header-text":headerTextColor,"--store-header-muted":headerMutedColor,
   64	    backgroundColor,color:textColor,
   65	  };
   66	  if (backgroundImageUrl) {
   67	    style.backgroundImage = "linear-gradient(rgba(0,0,0,"+overlay+"), rgba(0,0,0,"+overlay+")), url(\""+backgroundImageUrl+"\")";
   68	    style.backgroundSize="cover"; style.backgroundPosition="center"; style.backgroundAttachment="fixed";
   69	  }
   70	  return { themeClass:"theme_"+themeId, layoutClass:"layout_"+layout, menuStyle, menuVisibility, headerLogo, headerDescription, headerActions, headerAlignment, headerBrand, headerTagline, menuPosition, heroLayout, siteMode, style };
   71	};
   72	
