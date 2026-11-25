import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ArrowDown, ArrowRight, BriefcaseBusiness, Code2, Cpu, Headset, Mail, MessageCircle, MonitorCog, Wrench, Workflow, CheckCircle2 } from "lucide-react";
import { DEFAULT_PORTFOLIO } from "../helpers/portfolioConfig";
import { getPortfolio } from "../endpoints/portfolio_GET.schema";
import styles from "./emmanuel-ponle.module.css";

const serviceIcons = [Headset, Code2, MonitorCog, Wrench, Workflow, Cpu];

export default function EmmanuelPonlePortfolio() {
  const { data } = useQuery({ queryKey: ["emmanuel-portfolio"], queryFn: getPortfolio, staleTime: 15000, retry: 1 });
  const p = data?.portfolio ?? DEFAULT_PORTFOLIO;
  const phone = p.phone.replace(/\D/g, "");
  const whatsapp = `https://wa.me/${phone.startsWith("0") ? `234${phone.slice(1)}` : phone}`;
  return <div className={styles.page}>
    <Helmet>
      <title>{p.seoTitle}</title>
      <meta name="description" content={p.seoDescription} />
      <meta property="og:title" content={p.seoTitle} />
      <meta property="og:description" content={p.seoDescription} />
      {p.profileImageUrl && <meta property="og:image" content={p.profileImageUrl} />}
    </Helmet>
    <header className={styles.header}>
      <a className={styles.wordmark} href="#top">{p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}<span>.</span></a>
      <nav aria-label="Main navigation"><a href="#about">About</a><a href="#services">What I do</a><a href="#work">Projects</a><a href="#contact">Contact</a></nav>
      <a className={styles.headerCta} href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16}/> Let's talk</a>
    </header>
    <main id="top">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.availability}><span/> {p.availability}</div>
          <p className={styles.eyebrow}>{p.eyebrow}</p>
          <h1>{p.headline}</h1>
          <p className={styles.intro}>{p.intro}</p>
          <div className={styles.heroActions}><a className={styles.primaryBtn} href={whatsapp} target="_blank" rel="noreferrer">Contact me <ArrowRight size={17}/></a><a className={styles.secondaryBtn} href="#work">Explore my work <ArrowDown size={16}/></a></div>
          <div className={styles.heroMeta}>{p.meta.map((item,i)=><span key={`${item}-${i}`}>{item}</span>)}</div>
        </div>
        <aside className={styles.heroAside}>
          {p.profileImageUrl ? <img className={styles.profilePhoto} src={p.profileImageUrl} alt={p.name}/> : <div className={styles.monogram}>{p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}</div>}
          <div className={styles.asideRule}/><p className={styles.asideLabel}>MY APPROACH</p><p className={styles.asideQuote}>{p.approachTitle}</p><span className={styles.asideIndex}>01 / 04</span>
        </aside>
      </section>
      <section className={styles.trustLine}><span>CORE FOCUS</span><strong>Customer experience</strong><i/><strong>Reliable support</strong><i/><strong>Useful software</strong><i/><strong>Business technology</strong></section>
      <section className={styles.about} id="about">
        <div><p className={styles.sectionTag}>01 — ABOUT ME</p><h2>{p.aboutTitle}</h2></div>
        <div className={styles.aboutText}><p>{p.aboutOne}</p><p>{p.aboutTwo}</p><div className={styles.principles}><span><CheckCircle2 size={16}/> Clear communication</span><span><CheckCircle2 size={16}/> Practical troubleshooting</span><span><CheckCircle2 size={16}/> User-focused delivery</span></div></div>
      </section>
      <section className={styles.services} id="services">
        <div className={styles.sectionHeading}><div><p className={styles.sectionTag}>02 — CAPABILITIES</p><h2>How I can help</h2></div><p>From solving a user's immediate issue to building the software behind a better workflow.</p></div>
        <div className={styles.serviceGrid}>{p.services.map((service,i)=>{const Icon=serviceIcons[i%serviceIcons.length];return <article className={styles.serviceCard} key={`${service.title}-${i}`}><div className={styles.serviceTop}><Icon size={22}/><span>0{i+1}</span></div><h3>{service.title}</h3><p>{service.text}</p></article>})}</div>
      </section>
      <section className={styles.work} id="work">
        <div className={styles.sectionHeading}><div><p className={styles.sectionTag}>03 — SELECTED WORK</p><h2>Products & projects</h2></div><p>Examples of business and technology products I've been building and working on.</p></div>
        <div className={styles.projectList}>{p.projects.map((project,i)=><article className={styles.project} key={`${project.title}-${i}`}><span className={styles.projectNo}>0{i+1}</span><div>{project.imageUrl&&<img className={styles.projectCover} src={project.imageUrl} alt={project.title}/>}<p className={styles.projectType}>{project.category}</p><h3>{project.title}</h3><p className={styles.projectText}>{project.text}</p>{project.linkUrl&&<a className={styles.projectLink} href={project.linkUrl} target="_blank" rel="noreferrer">View project <ArrowRight size={14}/></a>}</div><BriefcaseBusiness className={styles.projectIcon} size={23}/></article>)}</div>
        <p className={styles.projectNote}>Project descriptions reflect work in progress and product development; detailed demonstrations and case studies can be shared where available.</p>
      </section>
      <section className={styles.process}><p className={styles.sectionTag}>04 — HOW I WORK</p><h2>{p.approachText}</h2><div className={styles.processGrid}><div><span>01</span><h3>Listen & understand</h3><p>Clarify the issue, the user's goal and the business context before choosing a solution.</p></div><div><span>02</span><h3>Diagnose & act</h3><p>Break problems down, test carefully and explain the next steps in plain language.</p></div><div><span>03</span><h3>Follow through</h3><p>Confirm the solution works, guide the user and document what matters.</p></div></div></section>
      <section className={styles.contact} id="contact"><div><p className={styles.sectionTag}>LET'S CONNECT</p><h2>{p.contactTitle}</h2><p>{p.contactText}</p></div><div className={styles.contactPanel}><a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={19}/><span><small>WHATSAPP / PHONE</small><strong>{p.phone}</strong></span><ArrowRight size={18}/></a><a href={`mailto:${p.email}`}><Mail size={19}/><span><small>EMAIL</small><strong>{p.email}</strong></span><ArrowRight size={18}/></a></div></section>
    </main>
    <footer className={styles.footer}><a className={styles.wordmark} href="#top">{p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}<span>.</span></a><p>{p.name} · Technology, support & development</p><a href="#top">Back to top ↑</a></footer>
  </div>;
}
