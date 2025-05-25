import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";

export default function Activity() {
  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Activity</h1>
        <div className={styles.infoBox}>
          <strong>Recent Activity</strong>
          <ul>
            <li>📝 You signed a new lease agreement.</li>
            <li>💸 Rent payment sent for May 2025.</li>
            <li>📬 Message received from landlord.</li>
            <li>🏠 You viewed 3 new properties.</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}