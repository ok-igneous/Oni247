import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe2,
  MessageCircle,
  Package,
   10	  Search,
   11	  Share2,
   12	  ShoppingBag,
   13	  Smartphone,
   14	  Sparkles,
   15	  Store,
   16	  Truck,
   17	} from "lucide-react";
   18	import { Button } from "../components/Button";
   19	import { useAuth } from "../helpers/useAuth";
   20	import styles from "./_index.module.css";
   21	
   22	const HomePage = () => {
   23	  const { authState } = useAuth();
   24	
   25	  if (authState.type === "authenticated") {
   26	    return <Navigate to="/dashboard" replace />;
   27	  }
   28	
   29	  return (
   30	    <div className={styles.page}>
   31	      <Helmet>
   32	        <title>Oniduka — Your business, online and ready to grow</title>
   33	        <meta
   34	          name="description"
   35	          content="Create a professional online presence for your business. Share products and services, receive enquiries and orders, and track simple business performance with Oniduka."
   36	        />
   37	        <meta property="og:title" content="Oniduka — Your business, online and ready to grow" />
   38	        <meta
   39	          property="og:description"
   40	          content="A simple online home for products, services, enquiries and orders."
   41	        />
   42	        <meta property="og:type" content="website" />
   43	      </Helmet>
   44	
   45	      <header className={styles.topBar}>
   46	        <Link to="/" className={styles.brand}>Oniduka</Link>
   47	        <nav className={styles.topNav} aria-label="Main navigation">
   48	          <a href="#features">Features</a>
   49	          <a href="#how-it-works">How it works</a>
   50	          <a href="#pricing">Pricing</a>
   51	          <Button asChild variant="ghost" size="sm">
   52	            <Link to="/login">Log in</Link>
   53	          </Button>
   54	        </nav>
   55	      </header>
   56	
   57	      <main>
   58	        <section className={styles.hero}>
   59	          <div className={styles.heroCopy}>
   60	            <div className={styles.eyebrow}><Sparkles size={15} /> Built for small businesses</div>
   61	            <h1 className={styles.headline}>Your business deserves more than a WhatsApp status.</h1>
   62	            <p className={styles.sub}>
   63	              Oniduka gives you a professional online home for your products,
   64	              services and customers — without the complexity of building and
   65	              maintaining a full website.
   66	            </p>
   67	            <div className={styles.actions}>
   68	              <Button asChild size="lg">
   69	                <Link to="/register">Create your free page <ArrowRight size={17} /></Link>
   70	              </Button>
   71	              <Button asChild variant="outline" size="lg">
   72	                <a href="#how-it-works">See how it works</a>
   73	              </Button>
   74	            </div>
   75	            <p className={styles.trialNote}>Start free. New businesses get 7 days of Premium features.</p>
   76	          </div>
   77	
   78	          <div className={styles.heroVisual} aria-label="Oniduka storefront preview">
   79	            <div className={styles.browserBar}>
   80	              <span /><span /><span />
   81	              <div className={styles.address}>yourbusiness.oniduka.com</div>
   82	            </div>
   83	            <div className={styles.storePreview}>
   84	              <div className={styles.previewIdentity}>
   85	                <div className={styles.previewLogo}>Y</div>
   86	                <div>
   87	                  <strong>Your Business</strong>
   88	                  <small>Quality products. Personal service.</small>
   89	                </div>
   90	              </div>
   91	              <div className={styles.previewHero}>Everything your customers need, in one place.</div>
   92	              <div className={styles.previewGrid}>
   93	                <div><div className={styles.previewImage}><ShoppingBag size={24} /></div><strong>Featured item</strong><small>₦25,000</small></div>
   94	                <div><div className={styles.previewImage}><Store size={24} /></div><strong>Popular service</strong><small>From ₦10,000</small></div>
   95	              </div>
   96	              <div className={styles.previewCta}><MessageCircle size={15} /> Message on WhatsApp</div>
   97	            </div>
   98	          </div>
   99	        </section>
  100	
  101	        <section className={styles.trustStrip}>
  102	          <span>One simple place for your business online</span>
  103	          <div><Store size={17} /> Storefront</div>
  104	          <div><MessageCircle size={17} /> WhatsApp</div>
  105	          <div><Smartphone size={17} /> Mobile ready</div>
  106	          <div><Globe2 size={17} /> Shareable link</div>
  107	        </section>
  108	
  109	        <section className={styles.section} id="features">
  110	          <div className={styles.sectionIntro}>
  111	            <span className={styles.kicker}>Everything you need to start</span>
  112	            <h2>From first impression to first order.</h2>
  113	            <p>Oniduka brings the practical pieces of an online business presence together in one lightweight workspace.</p>
  114	          </div>
  115	          <div className={styles.featureGrid}>
  116	            <article className={styles.featureCard}><div className={styles.icon}><Globe2 /></div><h3>Professional storefront</h3><p>Give customers a clean page with your business identity, products, services, contact details and brand.</p></article>
  117	            <article className={styles.featureCard}><div className={styles.icon}><Package /></div><h3>Products & services</h3><p>Organise your catalogue with prices, descriptions, categories, images and availability.</p></article>
  118	            <article className={styles.featureCard}><div className={styles.icon}><MessageCircle /></div><h3>Orders & enquiries</h3><p>Let customers ask questions or send orders, with WhatsApp built into the buying journey.</p></article>
  119	            <article className={styles.featureCard}><div className={styles.icon}><Share2 /></div><h3>Share everywhere</h3><p>Share your business page, products and collections through the channels your customers already use.</p></article>
  120	            <article className={styles.featureCard}><div className={styles.icon}><BarChart3 /></div><h3>Simple performance</h3><p>Premium gives you straightforward revenue, cost, gross profit and product performance reporting.</p></article>
  121	            <article className={styles.featureCard}><div className={styles.icon}><Search /></div><h3>Ready to be found</h3><p>Basic SEO, public pages and a sitemap help search engines discover your online presence.</p></article>
  122	          </div>
  123	        </section>
  124	
  125	        <section className={styles.splitSection} id="how-it-works">
  126	          <div>
  127	            <span className={styles.kicker}>Simple by design</span>
  128	            <h2>Go from idea to a live business page in minutes.</h2>
  129	            <p>Whether you sell fashion, food, electronics, beauty services, repairs or professional services, the setup stays focused on what your customers actually need.</p>
  130	          </div>
  131	          <ol className={styles.steps}>
  132	            <li><span>01</span><div><strong>Create your account</strong><p>Start with your business name and category.</p></div></li>
  133	            <li><span>02</span><div><strong>Add your catalogue</strong><p>Products and services, prices, photos and contact details.</p></div></li>
  134	            <li><span>03</span><div><strong>Publish your page</strong><p>Get a shareable storefront designed for phones and social sharing.</p></div></li>
  135	            <li><span>04</span><div><strong>Share and sell</strong><p>Send your link to customers and receive orders or enquiries.</p></div></li>
  136	          </ol>
  137	        </section>
  138	
  139	        <section className={styles.audienceSection}>
  140	          <div className={styles.sectionIntro}>
  141	            <span className={styles.kicker}>Made for real businesses</span>
  142	            <h2>One platform, many kinds of business.</h2>
  143	          </div>
  144	          <div className={styles.audienceGrid}>
  145	            <div><ShoppingBag /><strong>Retail & fashion</strong><span>Show products and take orders.</span></div>
  146	            <div><Store /><strong>Shops & supermarkets</strong><span>Publish your catalogue and categories.</span></div>
  147	            <div><Sparkles /><strong>Beauty & lifestyle</strong><span>Present services and enquiries.</span></div>
  148	            <div><Truck /><strong>Local services</strong><span>Turn your service list into a professional page.</span></div>
  149	          </div>
  150	        </section>
  151	
  152	        <section className={styles.pricingSection} id="pricing">
  153	          <div className={styles.pricingCard}>
  154	            <div>
  155	              <span className={styles.kicker}>Start without a heavy commitment</span>
  156	              <h2>Free to get started. Premium when you need more.</h2>
  157	              <p>Create your page, build your catalogue and start sharing. New businesses receive a 7-day Premium trial automatically.</p>
  158	            </div>
  159	            <div className={styles.priceBox}><strong>₦1,000</strong><span>up to 2 years of Premium</span><Link to="/register">Get started <ArrowRight size={16} /></Link></div>
  160	          </div>
  161	        </section>
  162	
  163	        <section className={styles.finalCta}>
  164	          <span className={styles.kicker}>Your business is already online somewhere.</span>
  165	          <h2>Give it a home.</h2>
  166	          <p>Build your Oniduka page and give customers one clear place to find you, browse what you offer and contact you.</p>
  167	          <Button asChild size="lg"><Link to="/register">Create your free page <ArrowRight size={17} /></Link></Button>
  168	          <div className={styles.checks}><span><Check size={15} /> No website coding</span><span><Check size={15} /> Mobile friendly</span><span><Check size={15} /> Start free</span></div>
  169	        </section>
  170	      </main>
  171	
  172	      <footer className={styles.footer}>
  173	        <div><strong>Oniduka</strong><span>A simple online home for your business.</span></div>
  174	        <div><Link to="/login">Log in</Link><Link to="/register">Create a page</Link></div>
  175	        <small>© {new Date().getFullYear()} Oniduka</small>
  176	      </footer>
  177	    </div>
  178	  );
  179	};
  180	
  181	export default HomePage;
