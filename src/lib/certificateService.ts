import jsPDF from 'jspdf';
import type { Profile, QualificationSession } from '../types';

export const certificateService = {
  /**
   * Generates a downloadable PDF certificate for a verified mentor.
   */
  generateCertificatePDF: (profile: Profile, session: QualificationSession) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Add a border
    doc.setLineWidth(5);
    doc.setDrawColor(37, 99, 235); // primary-600 (blue)
    doc.rect(10, 10, width - 20, height - 20);

    // Inner border
    doc.setLineWidth(1);
    doc.setDrawColor(71, 85, 105); // slate-600
    doc.rect(15, 15, width - 30, height - 30);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('SkillSwap Mentor Certificate', width / 2, 50, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.text('This is to certify that', width / 2, 75, { align: 'center' });

    // Name
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(36);
    doc.setTextColor(37, 99, 235);
    doc.text(profile.full_name || profile.username || 'Awesome User', width / 2, 95, { align: 'center' });

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`has successfully completed the qualification assessment for`, width / 2, 115, { align: 'center' });
    
    // Skill
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(session.skill_name.toUpperCase(), width / 2, 130, { align: 'center' });

    // Badge and Score
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(`Awarded the badge: ${session.badge || 'Verified Mentor'}`, width / 2, 145, { align: 'center' });
    doc.text(`Final Score: ${session.score || 0}%`, width / 2, 155, { align: 'center' });

    // Footer Info
    const dateStr = session.updated_at ? new Date(session.updated_at).toLocaleDateString() : new Date().toLocaleDateString();
    const certId = `CERT-${session.id.split('-')[0].toUpperCase()}-${new Date().getFullYear()}`;

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date of Issue: ${dateStr}`, 30, height - 30);
    doc.text(`Certificate ID: ${certId}`, width - 30, height - 30, { align: 'right' });

    // Save PDF
    doc.save(`SkillSwap-Certificate-${session.skill_name.replace(/\s+/g, '-')}.pdf`);
  }
};
