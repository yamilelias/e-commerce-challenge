import styles from "./ProductPages.module.css";

export function ContactSection() {
  return <section className={styles.contact} aria-labelledby="contact-title">
    <div className={styles.contactInner}>
      <p className={styles.eyebrow}>Field &amp; Form</p>
      <h2 className={styles.contactTitle} id="contact-title">Let&apos;s make space for something good.</h2>
      <p className={styles.contactText}>Have a question about a product? Get in touch and we&apos;ll help you find your way.</p>
      <a className={styles.contactButton} href="mailto:no-reply@fieldnform.com">Contact us <span aria-hidden="true">↗</span></a>
      <p className={styles.imageCredit}>Photo by Shixart1985 · <a href="https://commons.wikimedia.org/wiki/File:Modern_house_exterior_with_red_roof_and_landscaped_garden_under_clear_blue_sky.jpg" target="_blank" rel="noopener noreferrer">Source</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a></p>
    </div>
  </section>;
}
