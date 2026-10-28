"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  type EmblaCarouselType as CarouselApi,
  type EmblaOptionsType,
  type EmblaPluginType,
} from "embla-carousel";
   10	import {
   11	  ChevronLeft,
   12	  ChevronRight,
   13	  ChevronUp,
   14	  ChevronDown,
   15	} from "lucide-react";
   16	import { Button } from "./Button";
   17	import styles from "./Carousel.module.css";
   18	
   19	type CarouselProps = {
   20	  opts?: EmblaOptionsType;
   21	  plugins?: EmblaPluginType[];
   22	  orientation?: "horizontal" | "vertical";
   23	  setApi?: (api: CarouselApi) => void;
   24	  className?: string;
   25	};
   26	
   27	type CarouselContextProps = {
   28	  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
   29	  api: ReturnType<typeof useEmblaCarousel>[1];
   30	  scrollPrev: () => void;
   31	  scrollNext: () => void;
   32	  canScrollPrev: boolean;
   33	  canScrollNext: boolean;
   34	} & CarouselProps;
   35	
   36	const CarouselContext = React.createContext<CarouselContextProps>(null!);
   37	
   38	function useCarousel() {
   39	  const context = React.useContext(CarouselContext);
   40	
   41	  if (!context) {
   42	    throw new Error("useCarousel must be used within a <Carousel />");
   43	  }
   44	
   45	  return context;
   46	}
   47	
   48	const Carousel = React.forwardRef<
   49	  HTMLDivElement,
   50	  React.HTMLAttributes<HTMLDivElement> & CarouselProps
   51	>(
   52	  (
   53	    {
   54	      orientation = "horizontal",
   55	      opts,
   56	      setApi,
   57	      plugins,
   58	      className,
   59	      children,
   60	      ...props
   61	    },
   62	    ref
   63	  ) => {
   64	    const [carouselRef, api] = useEmblaCarousel(
   65	      {
   66	        ...opts,
   67	        axis: orientation === "horizontal" ? "x" : "y",
   68	      },
   69	      plugins
   70	    );
   71	    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
   72	    const [canScrollNext, setCanScrollNext] = React.useState(false);
   73	
   74	    const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
   75	    const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);
   76	
   77	    const onSelect = React.useCallback((api: CarouselApi) => {
   78	      if (!api) return;
   79	
   80	      setCanScrollPrev(api.canScrollPrev());
   81	      setCanScrollNext(api.canScrollNext());
   82	    }, []);
   83	
   84	    const handleKeyDown = React.useCallback(
   85	      (event: React.KeyboardEvent<HTMLDivElement>) => {
   86	        if (event.key === "ArrowLeft") {
   87	          event.preventDefault();
   88	          scrollPrev();
   89	        } else if (event.key === "ArrowRight") {
   90	          event.preventDefault();
   91	          scrollNext();
   92	        }
   93	      },
   94	      [scrollPrev, scrollNext]
   95	    );
   96	
   97	    React.useEffect(() => {
   98	      if (!api || !setApi) {
   99	        return;
  100	      }
  101	
  102	      setApi(api);
  103	    }, [api, setApi]);
  104	
  105	    React.useEffect(() => {
  106	      if (!api) {
  107	        return;
  108	      }
  109	
  110	      onSelect(api);
  111	      api.on("reInit", onSelect);
  112	      api.on("select", onSelect);
  113	
  114	      return () => {
  115	        api?.off("select", onSelect);
  116	      };
  117	    }, [api, onSelect]);
  118	
  119	    return (
  120	      <CarouselContext.Provider
  121	        value={{
  122	          carouselRef,
  123	          api: api,
  124	          opts,
  125	          orientation:
  126	            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
  127	          scrollPrev,
  128	          scrollNext,
  129	          canScrollPrev,
  130	          canScrollNext,
  131	        }}
  132	      >
  133	        <div
  134	          ref={ref}
  135	          onKeyDownCapture={handleKeyDown}
  136	          className={`${styles.carousel} ${className}`}
  137	          role="region"
  138	          aria-roledescription="carousel"
  139	          {...props}
  140	        >
  141	          {children}
  142	        </div>
  143	      </CarouselContext.Provider>
  144	    );
  145	  }
  146	);
  147	
  148	Carousel.displayName = "Carousel";
  149	
  150	const CarouselContent = React.forwardRef<
  151	  HTMLDivElement,
  152	  React.HTMLAttributes<HTMLDivElement>
  153	>(({ className, children, ...props }, ref) => {
  154	  const { carouselRef, orientation } = useCarousel();
  155	
  156	  return (
  157	    <div className={styles.viewport} ref={carouselRef}>
  158	      <div
  159	        ref={ref}
  160	        className={`${styles.container} ${
  161	          orientation === "horizontal" ? styles.horizontal : styles.vertical
  162	        } ${className || ""}`}
  163	        {...props}
  164	      >
  165	        {children}
  166	      </div>
  167	    </div>
  168	  );
  169	});
  170	CarouselContent.displayName = "CarouselContent";
  171	
  172	const CarouselItem = React.forwardRef<
  173	  HTMLDivElement,
  174	  React.HTMLAttributes<HTMLDivElement>
  175	>(({ className, children, ...props }, ref) => {
  176	  const { orientation } = React.useContext(CarouselContext) || {};
  177	
  178	  return (
  179	    <div
  180	      ref={ref}
  181	      role="group"
  182	      aria-roledescription="slide"
  183	      className={`${styles.item} ${
  184	        orientation === "horizontal" ? styles.horizontal : styles.vertical
  185	      } ${className || ""}`}
  186	      {...props}
  187	    >
  188	      {children}
  189	    </div>
  190	  );
  191	});
  192	
  193	CarouselItem.displayName = "CarouselItem";
  194	
  195	const CarouselPrevious = React.forwardRef<
  196	  HTMLButtonElement,
  197	  React.ComponentProps<typeof Button>
  198	>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  199	  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  200	
  201	  const Icon = orientation === "horizontal" ? ChevronLeft : ChevronUp;
  202	
  203	  return (
  204	    <div
  205	      className={`${styles.previousButtonContainer} ${
  206	        orientation === "horizontal" ? styles.horizontalNav : styles.verticalNav
  207	      }`}
  208	    >
  209	      <Button
  210	        ref={ref}
  211	        variant={variant}
  212	        size={size}
  213	        className={`${styles.previous} ${className || ""}`}
  214	        disabled={!canScrollPrev}
  215	        onClick={scrollPrev}
  216	        {...props}
  217	      >
  218	        <Icon className={styles.icon} />
  219	        <span className={styles.srOnly}>Previous slide</span>
  220	      </Button>
  221	    </div>
  222	  );
  223	});
  224	CarouselPrevious.displayName = "CarouselPrevious";
  225	
  226	const CarouselNext = React.forwardRef<
  227	  HTMLButtonElement,
  228	  React.ComponentProps<typeof Button>
  229	>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  230	  const { orientation, scrollNext, canScrollNext } = useCarousel();
  231	
  232	  const Icon = orientation === "horizontal" ? ChevronRight : ChevronDown;
  233	  return (
  234	    <div
  235	      className={`${styles.nextButtonContainer} ${
  236	        orientation === "horizontal" ? styles.horizontalNav : styles.verticalNav
  237	      }`}
  238	    >
  239	      <Button
  240	        ref={ref}
  241	        variant={variant}
  242	        size={size}
  243	        className={`${styles.next} ${className || ""}`}
  244	        disabled={!canScrollNext}
  245	        onClick={scrollNext}
  246	        {...props}
  247	      >
  248	        <Icon className={styles.icon} />
  249	        <span className={styles.srOnly}>Next slide</span>
  250	      </Button>
  251	    </div>
  252	  );
  253	});
  254	CarouselNext.displayName = "CarouselNext";
  255	
  256	export {
  257	  type CarouselApi,
  258	  Carousel,
  259	  CarouselContent,
  260	  CarouselItem,
  261	  CarouselPrevious,
  262	  CarouselNext,
  263	};
  264	
