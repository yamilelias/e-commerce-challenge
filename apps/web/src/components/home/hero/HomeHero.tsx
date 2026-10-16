import Link from "next/link";
import styles from "./HomeHero.module.css";

type HomeHeroProps = {
  headline?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function HomeHero({
  headline = "Find something that fits your day.",
  description = "Explore the catalog across home, outdoors, food, and more. See what is available today.",
  ctaHref = "/products",
  ctaLabel = "Shop products",
}: HomeHeroProps) {
  return (
    <section id="hero" className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={`${styles.eyebrow} ${styles.enterOne}`}>
            <span className={styles.eyebrowRule} aria-hidden="true" />
            Field &amp; Form
          </p>
          <h1 id="home-hero-heading" className={`${styles.headline} ${styles.enterTwo}`}>
            {headline}
          </h1>
          <p className={`${styles.description} ${styles.enterThree}`}>{description}</p>
          <div className={`${styles.actions} ${styles.enterFour}`}>
            <Link className={styles.cta} href={ctaHref}>
              <span>{ctaLabel}</span>
              <span className={styles.ctaArrow} aria-hidden="true">↗</span>
            </Link>
            <span className={styles.quietNote}>Browse at your own pace</span>
          </div>
        </div>

        <div className={styles.media} aria-hidden="true">
          <div className={styles.mediaFrame}>
            <div className={styles.mediaTexture} />
            <div className={styles.arcBack} />
            <div className={styles.sun} />
            <div className={styles.arcFront} />
            <div className={styles.plinth} />
            <div className={styles.mediaCaption}>
              <span>FIELD</span>
              <span>&amp; FORM</span>
            </div>
          </div>
          <div className={styles.cornerMark}>01 / A place to discover</div>
        </div>
      </div>
    </section>
  );
}
