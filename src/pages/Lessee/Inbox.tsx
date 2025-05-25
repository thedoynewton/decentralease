import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";

export default function Inbox() {
  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Inbox</h1>
        <div className={styles.infoBox}>
          <strong>Messages</strong>
          <ul>
            <li>
              <span>📩</span> <b>Landlord:</b> Your rent has been received. Thank you!
            </li>
            <li>
              <span>📩</span> <b>Support:</b> Welcome to Decentralease! Let us know if you need help.
            </li>
            <li>
              <span>📩</span> <b>System:</b> Your profile was updated successfully.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}