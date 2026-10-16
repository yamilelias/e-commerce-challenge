import Link from "next/link";
import { Reveal } from "@/components/home/motion/Reveal";
import styles from "./sections.module.css";

export function BrandStory() {
  return (
    <section id="story" className={styles.story} aria-labelledby="story-heading">
      <div className={`${styles.container} ${styles.storyGrid}`}>
        <Reveal className={styles.storyVisual}>
          <div className={styles.storyArtwork} aria-hidden="true">
            <span className={styles.storyArtworkLetter}>F<span>&amp;</span>F</span>
            <span className={styles.storyArtworkCaption}>Field &amp; Form</span>
          </div>
        </Reveal>
        <Reveal index={1} className={styles.storyText}>
          <p className={styles.storyEyebrow}>A little about us</p>
          <h2 id="story-heading" className={styles.storyHeading}>Room for every kind of find.</h2>
          <p className={styles.storyDescription}>Field &amp; Form brings a varied catalog into one easy place to explore. Take a look around and find what fits your day.</p>
          <Link className={styles.storyLink} href="/products">Explore the catalog <span aria-hidden="true">↗</span></Link>
        </Reveal>
      </div>
    </section>
  );
}
