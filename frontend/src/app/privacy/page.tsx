export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2>1. Introduction</h2>
      <p>
        Welcome to Vellum. We respect your privacy and are committed to protecting your personal data. 
        This privacy policy will inform you as to how we look after your personal data when you visit our website 
        and tell you about your privacy rights and how the law protects you, in compliance with the General Data Protection Regulation (GDPR).
      </p>

      <h2>2. Data We Collect</h2>
      <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
      <ul>
        <li><strong>Identity Data</strong> includes username and display name.</li>
        <li><strong>Contact Data</strong> includes email address.</li>
        <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
        <li><strong>Profile Data</strong> includes your username, password, avatars, bio, and interactions (posts, messages, friendships, and blocks).</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
      <ul>
        <li>To register you as a new user.</li>
        <li>To manage our relationship with you, including notifications and messaging.</li>
        <li>To enable you to partake in the social network (posting, commenting, chatting).</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, 
        used or accessed in an unauthorized way, altered or disclosed. Your data is encrypted and securely stored.
      </p>

      <h2>5. Your Legal Rights (GDPR)</h2>
      <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
      <ul>
        <li>Request access to your personal data.</li>
        <li>Request correction of your personal data.</li>
        <li>Request erasure of your personal data (Right to be Forgotten).</li>
        <li>Object to processing of your personal data.</li>
        <li>Request restriction of processing your personal data.</li>
        <li>Request transfer of your personal data.</li>
        <li>Right to withdraw consent.</li>
      </ul>

      <p>If you wish to exercise any of the rights set out above, please contact our Data Protection Officer.</p>
    </div>
  );
}
