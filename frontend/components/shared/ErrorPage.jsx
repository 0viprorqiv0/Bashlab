import styles from './ErrorPage.module.css';
import Footer from '../layout/Footer';

export function ErrorContent({ code, message }) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.code}>{code}</h1>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}

export default function ErrorPage({ code, message }) {
  return (
    <>
      <main>
        <ErrorContent code={code} message={message} />
      </main>
      <Footer />
    </>
  );
}
