import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";

export default function Profile() {
  // You can fetch and display user info here
  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>My Profile</h1>
        <div className={styles.infoBox}>
          <strong>Profile Information</strong>
          <ul>
            <li><b>Name:</b> John Doe</li>
            <li><b>Email:</b> johndoe@email.com</li>
            <li><b>Phone:</b> +1234567890</li>
            <li><b>Location:</b> New York, USA</li>
          </ul>
          <button className={styles.actionButton} style={{marginTop: 16}}>Edit Profile</button>
        </div>
      </div>
    </Layout>
  );
}