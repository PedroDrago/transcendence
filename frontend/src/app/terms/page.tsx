export default function TermsOfService() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing or using Vellum, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
        If you do not agree with any of these terms, you are prohibited from using or accessing this site.
      </p>

      <h2>2. Use License</h2>
      <p>
        Permission is granted to temporarily use the materials (information or software) on Vellum's website for personal, 
        non-commercial transitory viewing only. You may not:
      </p>
      <ul>
        <li>Modify or copy the materials.</li>
        <li>Use the materials for any commercial purpose.</li>
        <li>Attempt to decompile or reverse engineer any software contained on Vellum.</li>
        <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
      </ul>

      <h2>3. User Content</h2>
      <p>
        You retain all rights to any content you submit, post or display on or through Vellum. 
        By submitting, posting or displaying content, you grant us a worldwide, non-exclusive, royalty-free license 
        to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content.
      </p>

      <h2>4. Acceptable Use Policy</h2>
      <p>You agree not to use the platform to:</p>
      <ul>
        <li>Upload, post, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, or defamatory.</li>
        <li>Impersonate any person or entity.</li>
        <li>Interfere with or disrupt the service or servers.</li>
        <li>Violate any applicable local, state, national or international law.</li>
      </ul>

      <h2>5. Termination</h2>
      <p>
        We may terminate or suspend your access to our service immediately, without prior notice or liability, 
        for any reason whatsoever, including without limitation if you breach the Terms.
      </p>
    </div>
  );
}
