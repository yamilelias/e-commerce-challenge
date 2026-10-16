import Link from "next/link";
import type { Category } from "@/lib/api/types";
import { Reveal } from "@/components/home/motion/Reveal";
import styles from "./sections.module.css";

export function CollectionEditorial({ categories }: { categories: Category[] }) {
  const visibleCategories = categories.slice(0, 5);
  if (visibleCategories.length === 0) return null;

  return (
    <section id="collections" className={styles.collections} aria-labelledby="collections-heading">
      <div className={styles.container}>
        <Reveal>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Find your way in</p>
              <h2 id="collections-heading" className={styles.heading}>Browse by collection.</h2>
            </div>
            <p className={styles.headingAside}>The catalog, organized for wherever the day takes you.</p>
          </div>
        </Reveal>
        <div className={styles.collectionGrid}>
          {visibleCategories.map((category, index) => (
            <Reveal key={category.id} index={index} className={styles.collectionReveal}>
              <Link
                className={`${styles.collectionCard} ${styles[`collectionCard${index + 1}`]}`}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
              >
                <span className={styles.collectionNumber} aria-hidden="true">0{index + 1}</span>
                <span className={styles.collectionArt} aria-hidden="true"><span /></span>
                <span className={styles.collectionContent}>
                  <span className={styles.collectionLabel}>Explore collection</span>
                  <span className={styles.collectionName}>{category.name}</span>
                  <span className={styles.collectionArrow} aria-hidden="true">↗</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
