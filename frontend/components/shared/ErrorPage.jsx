import styles from './ErrorPage.module.css';
import Footer from '../layout/Footer';

export default function ErrorPage({ code, message }) {
  return (
    <>
      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.code}>{code}</h1>
          <p className={styles.message}>{message}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
