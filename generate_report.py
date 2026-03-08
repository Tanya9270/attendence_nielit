"""
Generate a professional NIELIT Internship Report in PDF format.
Author: Tanya Singh | NIELIT Intern
Project: QR Attendance System
Pages: ~12-15
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    ListFlowable, ListItem, KeepTogether, HRFlowable, Image
)
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
import datetime
import os

# ── Colors ───────────────────────────────────────────────────
NAVY        = HexColor('#002B5C')
DARK_BLUE   = HexColor('#0066B3')
LIGHT_BLUE  = HexColor('#00A0E3')
GREEN       = HexColor('#8DC63F')
DARK_GRAY   = HexColor('#333333')
MID_GRAY    = HexColor('#666666')
LIGHT_GRAY  = HexColor('#F0F4F8')
TABLE_HEADER = HexColor('#0066B3')
TABLE_ALT    = HexColor('#F5F8FC')

PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.2 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 1.0 * inch
BOTTOM_MARGIN = 1.0 * inch

today_str = datetime.date.today().strftime("%B %d, %Y")

# ── Styles ───────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    'ReportTitle', parent=styles['Title'],
    fontSize=26, leading=32, textColor=NAVY,
    fontName='Helvetica-Bold', alignment=TA_CENTER,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    'ReportSubtitle', parent=styles['Normal'],
    fontSize=14, leading=18, textColor=DARK_BLUE,
    fontName='Helvetica', alignment=TA_CENTER,
    spaceAfter=4
))

styles.add(ParagraphStyle(
    'ChapterTitle', parent=styles['Heading1'],
    fontSize=18, leading=24, textColor=NAVY,
    fontName='Helvetica-Bold', spaceBefore=20, spaceAfter=10,
    borderWidth=0, borderPadding=0,
))

styles.add(ParagraphStyle(
    'SectionTitle', parent=styles['Heading2'],
    fontSize=14, leading=18, textColor=DARK_BLUE,
    fontName='Helvetica-Bold', spaceBefore=14, spaceAfter=6,
))

styles.add(ParagraphStyle(
    'BodyText2', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=DARK_GRAY,
    fontName='Helvetica', alignment=TA_JUSTIFY,
    spaceBefore=4, spaceAfter=6,
))

styles.add(ParagraphStyle(
    'BulletItem', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=DARK_GRAY,
    fontName='Helvetica', alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=2, leftIndent=20, bulletIndent=8,
))

styles.add(ParagraphStyle(
    'CodeBlock', parent=styles['Normal'],
    fontSize=9, leading=12, textColor=HexColor('#1a1a2e'),
    fontName='Courier', alignment=TA_LEFT,
    spaceBefore=6, spaceAfter=6,
    backColor=HexColor('#f4f4f4'),
    leftIndent=15, rightIndent=15,
    borderWidth=0.5, borderColor=HexColor('#cccccc'),
    borderPadding=8,
))

styles.add(ParagraphStyle(
    'TableHeader', parent=styles['Normal'],
    fontSize=10, leading=13, textColor=white,
    fontName='Helvetica-Bold', alignment=TA_CENTER,
))

styles.add(ParagraphStyle(
    'TableCell', parent=styles['Normal'],
    fontSize=10, leading=13, textColor=DARK_GRAY,
    fontName='Helvetica', alignment=TA_LEFT,
))

styles.add(ParagraphStyle(
    'Caption', parent=styles['Normal'],
    fontSize=9, leading=12, textColor=MID_GRAY,
    fontName='Helvetica-Oblique', alignment=TA_CENTER,
    spaceBefore=4, spaceAfter=10,
))

styles.add(ParagraphStyle(
    'Footer', parent=styles['Normal'],
    fontSize=8, leading=10, textColor=MID_GRAY,
    fontName='Helvetica', alignment=TA_CENTER,
))


# ── Page number callback ─────────────────────────────────────
def add_page_number(canvas_obj, doc):
    """Draw header line + page number on each page (skip page 1 = cover)."""
    page_num = canvas_obj.getPageNumber()
    if page_num == 1:
        return  # skip cover page

    canvas_obj.saveState()

    # Header line
    canvas_obj.setStrokeColor(DARK_BLUE)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(LEFT_MARGIN, PAGE_H - 0.7 * inch,
                    PAGE_W - RIGHT_MARGIN, PAGE_H - 0.7 * inch)

    # Header text
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.drawString(LEFT_MARGIN, PAGE_H - 0.6 * inch,
                          "NIELIT Internship Report — QR Attendance System")
    canvas_obj.drawRightString(PAGE_W - RIGHT_MARGIN, PAGE_H - 0.6 * inch,
                               "Tanya Singh")

    # Footer line
    canvas_obj.setStrokeColor(HexColor('#cccccc'))
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(LEFT_MARGIN, 0.7 * inch,
                    PAGE_W - RIGHT_MARGIN, 0.7 * inch)

    # Page number
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.setFillColor(DARK_BLUE)
    canvas_obj.drawCentredString(PAGE_W / 2, 0.5 * inch, f"— {page_num} —")

    canvas_obj.restoreState()


# ── Build Document ───────────────────────────────────────────
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "NIELIT_Internship_Report_Tanya_Singh.pdf")

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title="NIELIT Internship Report — QR Attendance System",
    author="Tanya Singh",
)

story = []

# ═════════════════════════════════════════════════════════════
# COVER PAGE
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 1.2 * inch))

story.append(Paragraph("NATIONAL INSTITUTE OF ELECTRONICS &<br/>INFORMATION TECHNOLOGY", styles['ReportSubtitle']))
story.append(Spacer(1, 6))
story.append(Paragraph("(NIELIT)", ParagraphStyle(
    'tmp', parent=styles['ReportSubtitle'], fontSize=12, textColor=MID_GRAY)))

story.append(Spacer(1, 0.6 * inch))

story.append(HRFlowable(width="60%", thickness=2, color=DARK_BLUE,
                         spaceBefore=10, spaceAfter=10, hAlign='CENTER'))

story.append(Spacer(1, 0.3 * inch))

story.append(Paragraph("INTERNSHIP REPORT", ParagraphStyle(
    'tmp2', parent=styles['ReportTitle'], fontSize=22, textColor=DARK_BLUE)))

story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("QR Attendance System", styles['ReportTitle']))

story.append(Spacer(1, 6))
story.append(Paragraph(
    "A Dynamic QR-Based Student Attendance Management System",
    ParagraphStyle('tmp3', parent=styles['ReportSubtitle'], fontSize=12, textColor=MID_GRAY)
))

story.append(Spacer(1, 0.8 * inch))

story.append(HRFlowable(width="40%", thickness=1, color=GREEN,
                         spaceBefore=5, spaceAfter=15, hAlign='CENTER'))

# Details table
cover_data = [
    ['Submitted by:', 'Tanya Singh'],
    ['Role:', 'NIELIT Intern'],
    ['Email:', 'tanyasingh9270@gmail.com'],
    ['Institute:', 'NIELIT, Gorakhpur Centre'],
    ['Project:', 'QR Attendance System'],
    ['Date:', today_str],
]
cover_table = Table(cover_data, colWidths=[1.8 * inch, 3.2 * inch])
cover_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('TEXTCOLOR', (0, 0), (0, -1), DARK_BLUE),
    ('TEXTCOLOR', (1, 0), (1, -1), DARK_GRAY),
    ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (1, 0), (1, -1), 12),
]))
story.append(cover_table)

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph("Table of Contents", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceAfter=15))

toc_items = [
    ("1.", "Certificate / Declaration", "3"),
    ("2.", "Acknowledgement", "4"),
    ("3.", "Introduction & Objectives", "5"),
    ("4.", "Details of Work Allocated and Completed", "6"),
    ("5.", "Technology Stack & Tools Used", "7"),
    ("6.", "System Architecture", "8"),
    ("7.", "Database Design", "9"),
    ("8.", "Methodology Adopted", "10"),
    ("9.", "Implementation Details", "11"),
    ("10.", "Key Features", "12"),
    ("11.", "Testing & Deployment", "13"),
    ("12.", "Outcomes & Key Learnings", "14"),
    ("13.", "Challenges Faced", "14"),
    ("14.", "Conclusion & Future Scope", "15"),
    ("15.", "References", "15"),
]

toc_data = [[Paragraph(f'<b>{num}</b>', styles['BodyText2']),
             Paragraph(title, styles['BodyText2']),
             Paragraph(pg, ParagraphStyle('tocpg', parent=styles['BodyText2'], alignment=TA_RIGHT))]
            for num, title, pg in toc_items]

toc_table = Table(toc_data, colWidths=[0.5 * inch, 4.2 * inch, 0.6 * inch])
toc_table.setStyle(TableStyle([
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('LINEBELOW', (0, 0), (-1, -2), 0.3, HexColor('#e0e0e0')),
]))
story.append(toc_table)

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# CERTIFICATE / DECLARATION
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 0.2 * inch))
story.append(Paragraph("1. Certificate / Declaration", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph(
    "This is to certify that the Internship Report entitled <b>\"QR Attendance System\"</b> "
    "is a bonafide record of the work carried out by <b>Tanya Singh</b> during the internship "
    "at the National Institute of Electronics and Information Technology (NIELIT), Gorakhpur Centre.",
    styles['BodyText2']))

story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph(
    "The work presented in this report is original and has been carried out under the guidance "
    "of the faculty at NIELIT. The system was developed, tested, and deployed as a fully functional "
    "web application during the internship tenure.",
    styles['BodyText2']))

story.append(Spacer(1, 0.8 * inch))

sig_data = [
    ['', ''],
    ['____________________________', '____________________________'],
    ['Signature of Intern', 'Signature of Supervisor'],
    ['Tanya Singh', ''],
    [f'Date: {today_str}', f'Date: {today_str}'],
]
sig_table = Table(sig_data, colWidths=[2.8 * inch, 2.8 * inch])
sig_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('TEXTCOLOR', (0, 0), (-1, -1), DARK_GRAY),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(sig_table)

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# ACKNOWLEDGEMENT
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 0.2 * inch))
story.append(Paragraph("2. Acknowledgement", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

ack_paras = [
    "I would like to express my sincere gratitude to the <b>National Institute of Electronics and "
    "Information Technology (NIELIT)</b>, Gorakhpur Centre, for providing me with the opportunity "
    "to undertake this internship and gain valuable hands-on experience in web application development.",

    "I am deeply thankful to my project supervisor and the faculty members at NIELIT for their "
    "continuous guidance, support, and encouragement throughout the duration of this internship. "
    "Their expertise and mentorship were instrumental in the successful completion of this project.",

    "I also extend my appreciation to my fellow interns and colleagues who provided constructive "
    "feedback and helped in testing the application. Their collaborative spirit made the development "
    "process both productive and enjoyable.",

    "Finally, I would like to thank my family for their unwavering support and motivation during "
    "this internship period.",

    "<br/><br/><b>Tanya Singh</b><br/>NIELIT Intern<br/>" + today_str,
]

for p in ack_paras:
    story.append(Paragraph(p, styles['BodyText2']))
    story.append(Spacer(1, 6))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 3. INTRODUCTION & OBJECTIVES
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("3. Introduction & Objectives", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("3.1 Introduction", styles['SectionTitle']))

story.append(Paragraph(
    "Attendance management is a fundamental administrative activity in educational institutions. "
    "Traditional methods such as manual roll calls and paper-based registers are not only "
    "time-consuming but also susceptible to errors, proxy attendance, and data loss. With the "
    "advancement of web technologies and mobile devices, there is a strong need for a digital, "
    "secure, and efficient attendance tracking solution.",
    styles['BodyText2']))

story.append(Paragraph(
    "The <b>QR Attendance System</b> is a full-stack web application developed during the NIELIT "
    "internship to address these challenges. The system leverages dynamic QR codes that regenerate "
    "every 15 seconds, ensuring that only students physically present in the classroom at that "
    "moment can mark their attendance. The application features separate portals for Students, "
    "Teachers, and Administrators, providing role-specific functionality and a seamless user experience.",
    styles['BodyText2']))

story.append(Paragraph(
    "The system is built using modern technologies including React.js for the frontend, "
    "Supabase (PostgreSQL + Edge Functions) for the backend, and is deployed on Netlify for "
    "production accessibility. It supports real-time attendance tracking, monthly analytics, "
    "and export capabilities in PDF and CSV formats.",
    styles['BodyText2']))

story.append(Spacer(1, 8))
story.append(Paragraph("3.2 Objectives", styles['SectionTitle']))

objectives = [
    "To develop a secure, web-based attendance management system using dynamic QR codes",
    "To implement a 15-second rotating QR code mechanism to prevent proxy attendance",
    "To create separate portals for Students, Teachers, and Administrators with role-based access control",
    "To enable real-time attendance tracking with exact scan timestamps",
    "To provide comprehensive daily and monthly attendance reporting capabilities",
    "To implement PDF and CSV export functionality for official record-keeping",
    "To ensure the system works across devices including mobile phones for QR scanning",
    "To deploy the application on cloud infrastructure (Netlify + Supabase) for 24/7 accessibility",
    "To design a scalable database schema supporting multiple courses and teachers",
]

for obj in objectives:
    story.append(Paragraph(f"• {obj}", styles['BulletItem']))

story.append(Spacer(1, 8))
story.append(Paragraph("3.3 Problem Statement", styles['SectionTitle']))

story.append(Paragraph(
    "Traditional attendance systems in educational institutions suffer from several critical issues: "
    "manual roll calls consume valuable lecture time, paper registers can be easily manipulated for "
    "proxy attendance, there is no audit trail to verify when attendance was actually marked, and "
    "generating monthly reports requires tedious manual compilation. Additionally, institutions like "
    "NIELIT that conduct multiple courses simultaneously need a system that can manage attendance "
    "across different courses with different teachers efficiently.",
    styles['BodyText2']))

story.append(Paragraph(
    "The objective of this project was to design and implement a solution that eliminates these "
    "problems by combining QR technology with strict time validation, digital record-keeping, and "
    "automated report generation.",
    styles['BodyText2']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 4. DETAILS OF WORK ALLOCATED AND COMPLETED
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("4. Details of Work Allocated and Completed", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("4.1 Work Allocated", styles['SectionTitle']))

story.append(Paragraph(
    "The following work was allocated as part of the NIELIT internship program:",
    styles['BodyText2']))

allocated_work = [
    "Design and develop a complete web-based student attendance system",
    "Implement QR code-based attendance marking with anti-proxy mechanisms",
    "Create a multi-role application with Admin, Teacher, and Student interfaces",
    "Develop backend API services for attendance management operations",
    "Design and implement a PostgreSQL database schema for the system",
    "Build PDF and CSV export functionality for attendance reports",
    "Deploy the application on cloud infrastructure for production use",
    "Write documentation and prepare a project presentation",
]

for item in allocated_work:
    story.append(Paragraph(f"• {item}", styles['BulletItem']))

story.append(Spacer(1, 10))
story.append(Paragraph("4.2 Work Completed", styles['SectionTitle']))

work_data = [
    [Paragraph('<b>S.No</b>', styles['TableHeader']),
     Paragraph('<b>Module / Task</b>', styles['TableHeader']),
     Paragraph('<b>Description</b>', styles['TableHeader']),
     Paragraph('<b>Status</b>', styles['TableHeader'])],
    [Paragraph('1', styles['TableCell']),
     Paragraph('User Authentication', styles['TableCell']),
     Paragraph('Login, registration, password reset with Supabase Auth + JWT', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('2', styles['TableCell']),
     Paragraph('Student Portal', styles['TableCell']),
     Paragraph('QR camera scanning, attendance confirmation, personal attendance history', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('3', styles['TableCell']),
     Paragraph('Teacher Portal', styles['TableCell']),
     Paragraph('QR generation, daily/monthly views, attendance session management', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('4', styles['TableCell']),
     Paragraph('Admin Panel', styles['TableCell']),
     Paragraph('CRUD for teachers, students, courses; dashboard statistics', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('5', styles['TableCell']),
     Paragraph('Backend API', styles['TableCell']),
     Paragraph('3 Supabase Edge Functions: attendance-api, manage-users, mark-attendance', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('6', styles['TableCell']),
     Paragraph('Database Design', styles['TableCell']),
     Paragraph('PostgreSQL tables: students, courses, attendance, profiles + migrations', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('7', styles['TableCell']),
     Paragraph('PDF/CSV Export', styles['TableCell']),
     Paragraph('Calendar-style monthly PDF with NIELIT branding + CSV export', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
    [Paragraph('8', styles['TableCell']),
     Paragraph('Deployment', styles['TableCell']),
     Paragraph('Netlify (frontend CI/CD) + Supabase Cloud (backend + database)', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Completed</font>', styles['TableCell'])],
]

work_table = Table(work_data, colWidths=[0.5 * inch, 1.3 * inch, 2.8 * inch, 0.8 * inch])
work_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    ('BACKGROUND', (0, 1), (-1, 1), white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ALT),
    ('BACKGROUND', (0, 3), (-1, 3), white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ALT),
    ('BACKGROUND', (0, 5), (-1, 5), white),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ALT),
    ('BACKGROUND', (0, 7), (-1, 7), white),
    ('BACKGROUND', (0, 8), (-1, 8), TABLE_ALT),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(work_table)

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 5. TECHNOLOGY STACK
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("5. Technology Stack & Tools Used", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("5.1 Frontend Technologies", styles['SectionTitle']))

fe_data = [
    [Paragraph('<b>Technology</b>', styles['TableHeader']),
     Paragraph('<b>Version</b>', styles['TableHeader']),
     Paragraph('<b>Purpose</b>', styles['TableHeader'])],
    [Paragraph('React.js', styles['TableCell']),
     Paragraph('18.2', styles['TableCell']),
     Paragraph('Core UI library for building interactive Single Page Application', styles['TableCell'])],
    [Paragraph('Vite', styles['TableCell']),
     Paragraph('5.0', styles['TableCell']),
     Paragraph('Fast build tool and development server with Hot Module Replacement', styles['TableCell'])],
    [Paragraph('React Router', styles['TableCell']),
     Paragraph('6.20', styles['TableCell']),
     Paragraph('Client-side routing for navigation between portals', styles['TableCell'])],
    [Paragraph('html5-qrcode', styles['TableCell']),
     Paragraph('2.3.8', styles['TableCell']),
     Paragraph('Camera-based QR code scanning using device webcam/camera', styles['TableCell'])],
    [Paragraph('qrcode', styles['TableCell']),
     Paragraph('1.5.3', styles['TableCell']),
     Paragraph('QR code generation for teacher-side attendance session', styles['TableCell'])],
    [Paragraph('jsPDF', styles['TableCell']),
     Paragraph('2.5.1', styles['TableCell']),
     Paragraph('Client-side PDF generation for monthly attendance reports', styles['TableCell'])],
    [Paragraph('Supabase JS', styles['TableCell']),
     Paragraph('2.39', styles['TableCell']),
     Paragraph('Client SDK for Supabase authentication and API calls', styles['TableCell'])],
]

fe_table = Table(fe_data, colWidths=[1.3 * inch, 0.8 * inch, 3.2 * inch])
fe_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(fe_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(fe_table)

story.append(Spacer(1, 12))
story.append(Paragraph("5.2 Backend Technologies", styles['SectionTitle']))

be_data = [
    [Paragraph('<b>Technology</b>', styles['TableHeader']),
     Paragraph('<b>Purpose</b>', styles['TableHeader'])],
    [Paragraph('Supabase Edge Functions (Deno)', styles['TableCell']),
     Paragraph('Serverless API endpoints written in TypeScript, running on Deno runtime', styles['TableCell'])],
    [Paragraph('Supabase Auth', styles['TableCell']),
     Paragraph('User authentication with JWT tokens, email-based registration and login', styles['TableCell'])],
    [Paragraph('PostgreSQL', styles['TableCell']),
     Paragraph('Relational database for storing students, attendance records, courses, and profiles', styles['TableCell'])],
    [Paragraph('Row Level Security (RLS)', styles['TableCell']),
     Paragraph('Database-level access control policies ensuring data isolation', styles['TableCell'])],
]

be_table = Table(be_data, colWidths=[2.2 * inch, 3.2 * inch])
be_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(be_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(be_table)

story.append(Spacer(1, 12))
story.append(Paragraph("5.3 DevOps & Deployment Tools", styles['SectionTitle']))

devops_items = [
    "<b>Netlify</b> — Frontend hosting with automatic CI/CD from GitHub pushes",
    "<b>Supabase Cloud</b> — Managed PostgreSQL database, Auth, and Edge Functions hosting",
    "<b>Git & GitHub</b> — Version control and source code repository management",
    "<b>VS Code</b> — Primary development IDE with extensions for React, TypeScript, and Git",
    "<b>Chrome DevTools</b> — Frontend debugging, network inspection, and performance profiling",
]

for item in devops_items:
    story.append(Paragraph(f"• {item}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 6. SYSTEM ARCHITECTURE
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("6. System Architecture", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph(
    "The QR Attendance System follows a <b>three-tier architecture</b> consisting of a Presentation "
    "Layer (frontend), Application Layer (backend API), and Data Layer (database). This separation "
    "of concerns ensures modularity, scalability, and maintainability.",
    styles['BodyText2']))

story.append(Spacer(1, 10))
story.append(Paragraph("6.1 Architecture Overview", styles['SectionTitle']))

# Architecture as a styled table acting as a diagram
arch_data = [
    [Paragraph('<b>PRESENTATION LAYER</b><br/><font size=9>React 18 + Vite 5  |  Hosted on Netlify</font>', styles['TableHeader'])],
    [Paragraph(
        '<font size=9>Student Portal (QR Scanning)  |  Teacher Portal (QR Generation + Management)  |  Admin Panel (CRUD + Dashboard)</font>',
        ParagraphStyle('archcell', parent=styles['TableCell'], alignment=TA_CENTER, textColor=DARK_BLUE))],
    [Paragraph('▼', ParagraphStyle('arrow', parent=styles['TableCell'], alignment=TA_CENTER, fontSize=16, textColor=GREEN))],
    [Paragraph('<b>APPLICATION LAYER</b><br/><font size=9>Supabase Edge Functions (Deno/TypeScript)  |  Serverless</font>', styles['TableHeader'])],
    [Paragraph(
        '<font size=9>attendance-api (mark, get-daily, get-monthly, finalize)  |  manage-users (CRUD)  |  mark-attendance (QR RPC)</font>',
        ParagraphStyle('archcell2', parent=styles['TableCell'], alignment=TA_CENTER, textColor=DARK_BLUE))],
    [Paragraph('▼', ParagraphStyle('arrow2', parent=styles['TableCell'], alignment=TA_CENTER, fontSize=16, textColor=GREEN))],
    [Paragraph('<b>DATA LAYER</b><br/><font size=9>PostgreSQL (Supabase)  |  Supabase Auth (JWT)</font>', styles['TableHeader'])],
    [Paragraph(
        '<font size=9>Tables: students, courses, attendance, profiles  |  Row Level Security  |  UUID-based Auth</font>',
        ParagraphStyle('archcell3', parent=styles['TableCell'], alignment=TA_CENTER, textColor=DARK_BLUE))],
]

arch_table = Table(arch_data, colWidths=[5.3 * inch])
arch_styles = [
    ('BACKGROUND', (0, 0), (0, 0), DARK_BLUE),
    ('BACKGROUND', (0, 1), (0, 1), TABLE_ALT),
    ('BACKGROUND', (0, 2), (0, 2), white),
    ('BACKGROUND', (0, 3), (0, 3), HexColor('#008060')),
    ('BACKGROUND', (0, 4), (0, 4), TABLE_ALT),
    ('BACKGROUND', (0, 5), (0, 5), white),
    ('BACKGROUND', (0, 6), (0, 6), HexColor('#8B5CF6')),
    ('BACKGROUND', (0, 7), (0, 7), TABLE_ALT),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
]
arch_table.setStyle(TableStyle(arch_styles))
story.append(arch_table)
story.append(Paragraph("Figure 1: Three-Tier System Architecture", styles['Caption']))

story.append(Spacer(1, 10))
story.append(Paragraph("6.2 Component Structure", styles['SectionTitle']))

story.append(Paragraph(
    "The frontend application is organized into the following React components:",
    styles['BodyText2']))

components = [
    "<b>Login.jsx</b> — Authentication page with email/password login and role-based redirection",
    "<b>StudentPortal.jsx</b> — Student interface for QR scanning and viewing personal attendance",
    "<b>TeacherPortal.jsx</b> — Faculty interface with tabs: QR Code, Daily View, Monthly Report",
    "<b>AdminPanel.jsx</b> — Administrative dashboard for managing teachers, students, and courses",
    "<b>QRScanner.jsx</b> — Reusable QR code camera scanning component using html5-qrcode",
    "<b>Navigation.jsx</b> — Top navigation bar with user info, role badge, and logout functionality",
    "<b>ForgotPassword.jsx</b> — Password recovery via email",
    "<b>ResetPassword.jsx</b> — Token-based password reset form",
    "<b>ChangePassword.jsx</b> — In-app password change for authenticated users",
]

for comp in components:
    story.append(Paragraph(f"• {comp}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 7. DATABASE DESIGN
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("7. Database Design", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph(
    "The system uses PostgreSQL hosted on Supabase. The database schema consists of four "
    "primary tables along with the Supabase Auth system for user authentication.",
    styles['BodyText2']))

story.append(Spacer(1, 8))
story.append(Paragraph("7.1 Table: students", styles['SectionTitle']))

students_schema = [
    [Paragraph('<b>Column</b>', styles['TableHeader']),
     Paragraph('<b>Type</b>', styles['TableHeader']),
     Paragraph('<b>Description</b>', styles['TableHeader'])],
    [Paragraph('id', styles['TableCell']), Paragraph('SERIAL (PK)', styles['TableCell']),
     Paragraph('Auto-incrementing primary key', styles['TableCell'])],
    [Paragraph('roll_number', styles['TableCell']), Paragraph('VARCHAR', styles['TableCell']),
     Paragraph('Unique roll number per course', styles['TableCell'])],
    [Paragraph('name', styles['TableCell']), Paragraph('VARCHAR', styles['TableCell']),
     Paragraph('Student full name', styles['TableCell'])],
    [Paragraph('email', styles['TableCell']), Paragraph('VARCHAR', styles['TableCell']),
     Paragraph('Student email address', styles['TableCell'])],
    [Paragraph('course_code', styles['TableCell']), Paragraph('VARCHAR', styles['TableCell']),
     Paragraph('Course code reference (e.g., JAI-001)', styles['TableCell'])],
    [Paragraph('user_id', styles['TableCell']), Paragraph('UUID', styles['TableCell']),
     Paragraph('Reference to Supabase Auth user', styles['TableCell'])],
]

stu_table = Table(students_schema, colWidths=[1.2 * inch, 1.2 * inch, 3.0 * inch])
stu_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(students_schema))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(stu_table)

story.append(Spacer(1, 10))
story.append(Paragraph("7.2 Table: attendance", styles['SectionTitle']))

att_schema = [
    [Paragraph('<b>Column</b>', styles['TableHeader']),
     Paragraph('<b>Type</b>', styles['TableHeader']),
     Paragraph('<b>Description</b>', styles['TableHeader'])],
    [Paragraph('id', styles['TableCell']), Paragraph('VARCHAR (PK)', styles['TableCell']),
     Paragraph('Composite key: {student_id}-{date}', styles['TableCell'])],
    [Paragraph('student_id', styles['TableCell']), Paragraph('INTEGER (FK)', styles['TableCell']),
     Paragraph('References students.id', styles['TableCell'])],
    [Paragraph('date', styles['TableCell']), Paragraph('DATE', styles['TableCell']),
     Paragraph('Attendance date (YYYY-MM-DD)', styles['TableCell'])],
    [Paragraph('status', styles['TableCell']), Paragraph('VARCHAR', styles['TableCell']),
     Paragraph('Attendance status: "present" or "absent"', styles['TableCell'])],
    [Paragraph('scan_time', styles['TableCell']), Paragraph('TIMESTAMP', styles['TableCell']),
     Paragraph('Exact ISO timestamp of QR scan', styles['TableCell'])],
    [Paragraph('finalized', styles['TableCell']), Paragraph('BOOLEAN', styles['TableCell']),
     Paragraph('Whether attendance is locked for the day', styles['TableCell'])],
]

att_table = Table(att_schema, colWidths=[1.2 * inch, 1.2 * inch, 3.0 * inch])
att_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(att_schema))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(att_table)

story.append(Spacer(1, 10))
story.append(Paragraph("7.3 Table: courses", styles['SectionTitle']))

story.append(Paragraph(
    "Stores course information with teacher assignment. Fields: <b>course_code</b> (PK), "
    "<b>course_name</b>, <b>teacher_id</b> (UUID → Supabase Auth), <b>teacher_name</b>.",
    styles['BodyText2']))

story.append(Spacer(1, 6))
story.append(Paragraph("7.4 Table: profiles", styles['SectionTitle']))

story.append(Paragraph(
    "Stores user roles mapped to Supabase Auth UUIDs. Fields: <b>id</b> (UUID, PK → auth.users), "
    "<b>role</b> (admin / teacher / student). This table enables role-based access control.",
    styles['BodyText2']))

story.append(Spacer(1, 6))
story.append(Paragraph("7.5 Database Migrations", styles['SectionTitle']))

story.append(Paragraph(
    "The project includes 8 database migrations applied sequentially to evolve the schema:",
    styles['BodyText2']))

migrations = [
    "Add email column to students table",
    "Fix students user_id type to UUID",
    "Add unique constraint on students user_id",
    "Fix roll_number uniqueness constraint per course",
    "Allow students to enroll in multiple courses",
    "Cleanup orphan student records",
    "Ensure correct constraints on all tables",
    "Complete reset and rebuild of students table schema",
]

for m in migrations:
    story.append(Paragraph(f"• {m}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 8. METHODOLOGY ADOPTED
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("8. Methodology Adopted", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph(
    "The project followed an <b>Agile development methodology</b> with iterative development "
    "cycles. Given the internship timeframe, the work was organized into focused sprints, each "
    "delivering a functional increment of the system.",
    styles['BodyText2']))

story.append(Spacer(1, 8))
story.append(Paragraph("8.1 Development Phases", styles['SectionTitle']))

phases = [
    ("<b>Phase 1 — Requirements Analysis & Design:</b> Understanding the attendance management "
     "requirements at NIELIT, identifying use cases for each user role (Admin, Teacher, Student), "
     "designing the database schema, and planning the system architecture."),

    ("<b>Phase 2 — Backend Development:</b> Setting up the Supabase project, creating PostgreSQL "
     "tables, writing Edge Functions for authentication, attendance management (mark-attendance, "
     "mark-self, get-daily, get-monthly), and user management (CRUD operations)."),

    ("<b>Phase 3 — Frontend Development:</b> Building the React SPA with Vite, developing "
     "individual components (Login, StudentPortal, TeacherPortal, AdminPanel), integrating QR code "
     "generation and scanning libraries, and implementing responsive UI design."),

    ("<b>Phase 4 — Integration & Testing:</b> Connecting frontend to backend APIs, testing QR "
     "scanning across devices (laptop camera, mobile phone), validating time-window logic, testing "
     "edge cases (duplicate marking, expired QR, wrong course), and fixing bugs."),

    ("<b>Phase 5 — Report Generation:</b> Implementing the monthly attendance report with calendar-style "
     "PDF export using jsPDF, adding CSV export, building the interactive monthly dashboard with daily "
     "attendance grid showing Present/Absent/Weekend status for each day."),

    ("<b>Phase 6 — Deployment & Documentation:</b> Deploying the frontend on Netlify with CI/CD "
     "from GitHub, configuring Supabase Edge Functions for production, writing project documentation, "
     "and preparing the internship report and presentation."),
]

for phase in phases:
    story.append(Paragraph(phase, styles['BodyText2']))
    story.append(Spacer(1, 4))

story.append(Spacer(1, 8))
story.append(Paragraph("8.2 Tools & Practices", styles['SectionTitle']))

practices = [
    "<b>Version Control:</b> Git with GitHub for source code management, branching, and collaboration",
    "<b>CI/CD:</b> Netlify auto-deploys on every git push to the main branch",
    "<b>Code Editor:</b> Visual Studio Code with ESLint, Prettier, and React DevTools",
    "<b>API Testing:</b> Browser DevTools Network tab + manual PowerShell/curl testing",
    "<b>Database Management:</b> Supabase Dashboard for SQL queries and table management",
]

for p in practices:
    story.append(Paragraph(f"• {p}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 9. IMPLEMENTATION DETAILS
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("9. Implementation Details", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("9.1 QR Code Attendance Flow", styles['SectionTitle']))

story.append(Paragraph(
    "The core innovation of this system is the dynamic QR code-based attendance mechanism. "
    "The flow works as follows:",
    styles['BodyText2']))

qr_flow = [
    "<b>Step 1:</b> Teacher logs into the Faculty Portal and clicks \"Start Attendance Session\".",
    "<b>Step 2:</b> The system generates a QR code containing: ATTENDANCE|{teacher_id}|{timestamp_ms}.",
    "<b>Step 3:</b> The QR code automatically regenerates every 15 seconds with a fresh timestamp.",
    "<b>Step 4:</b> Students open the Student Portal on their mobile phones and scan the QR code.",
    "<b>Step 5:</b> The backend receives the scan and validates: (a) QR format is correct, "
    "(b) timestamp is within 30 seconds, (c) teacher teaches the student's course, "
    "(d) student hasn't already been marked today.",
    "<b>Step 6:</b> On successful validation, an attendance record is inserted with status='present' "
    "and the exact scan timestamp.",
    "<b>Step 7:</b> The teacher's dashboard updates in real-time showing Present/Absent/Total counts.",
]

for step in qr_flow:
    story.append(Paragraph(step, styles['BodyText2']))
    story.append(Spacer(1, 2))

story.append(Spacer(1, 8))
story.append(Paragraph("9.2 QR Payload Format", styles['SectionTitle']))

story.append(Paragraph(
    "The QR code encodes a pipe-separated string with the following structure:",
    styles['BodyText2']))

story.append(Paragraph(
    "ATTENDANCE|{teacher_uuid}|{unix_timestamp_milliseconds}",
    styles['CodeBlock']))

story.append(Paragraph(
    "Example: <font face='Courier' size=9>ATTENDANCE|9985918c-67cf-4d56-9651-cb04a4609f41|1741392000000</font>",
    styles['BodyText2']))

story.append(Spacer(1, 8))
story.append(Paragraph("9.3 Backend Edge Functions", styles['SectionTitle']))

story.append(Paragraph(
    "The backend consists of three Supabase Edge Functions written in TypeScript:",
    styles['BodyText2']))

ef_data = [
    [Paragraph('<b>Function</b>', styles['TableHeader']),
     Paragraph('<b>Actions</b>', styles['TableHeader']),
     Paragraph('<b>Description</b>', styles['TableHeader'])],
    [Paragraph('attendance-api', styles['TableCell']),
     Paragraph('server-time, mark-attendance, mark-self, get-daily, get-monthly, get-courses, finalize', styles['TableCell']),
     Paragraph('Core attendance operations — marking, querying, reporting', styles['TableCell'])],
    [Paragraph('manage-users', styles['TableCell']),
     Paragraph('list, delete, create (teacher/student)', styles['TableCell']),
     Paragraph('User and course CRUD operations for admin panel', styles['TableCell'])],
    [Paragraph('mark-attendance', styles['TableCell']),
     Paragraph('QR RPC call', styles['TableCell']),
     Paragraph('Legacy function for direct QR-based attendance marking via RPC', styles['TableCell'])],
]

ef_table = Table(ef_data, colWidths=[1.2 * inch, 2.0 * inch, 2.2 * inch])
ef_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(ef_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(ef_table)
story.append(Paragraph("Table: Supabase Edge Functions Overview", styles['Caption']))

story.append(Spacer(1, 8))
story.append(Paragraph("9.4 PDF Report Generation", styles['SectionTitle']))

story.append(Paragraph(
    "The monthly attendance PDF is generated client-side using jsPDF in landscape orientation. "
    "The report includes:",
    styles['BodyText2']))

pdf_features = [
    "NIELIT institutional header with organization name",
    "Course code, course name, faculty name, month/year",
    "Calendar-style grid with columns for days 1-31",
    "Per-student rows showing P (Present), A (Absent), OFF (Weekend) for each day",
    "Present count column at the end of each student row",
    "Color coding: green for Present, red for Absent, gray for Weekends",
    "Session days count and total students summary",
    "Legend explaining all symbols used in the report",
]

for feat in pdf_features:
    story.append(Paragraph(f"• {feat}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 10. KEY FEATURES
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("10. Key Features", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

key_features_detailed = [
    ("<b>Dynamic QR Code Generation:</b>", "The teacher's QR code automatically regenerates every "
     "15 seconds with a fresh timestamp, ensuring that screenshots or photos of old QR codes cannot "
     "be used for proxy attendance."),

    ("<b>Time-Window Validation:</b>", "When a student scans the QR code, the system verifies that "
     "the embedded timestamp is within a 30-second window from the current server time. This prevents "
     "students from marking attendance using stale QR codes."),

    ("<b>Duplicate Prevention:</b>", "The attendance table uses a composite primary key "
     "(student_id + date) ensuring that each student can only be marked present once per day. "
     "Subsequent scan attempts return an 'already_marked' response."),

    ("<b>Multi-Portal Architecture:</b>", "The system provides three distinct interfaces: "
     "a Student Portal for QR scanning, a Teacher/Faculty Portal for session management and "
     "reports, and an Admin Panel for user/course management."),

    ("<b>Real-Time Dashboard:</b>", "The teacher portal displays live counts of Present, Absent, "
     "and Total students during an active attendance session. The monthly report includes an "
     "interactive grid showing each student's attendance for every day of the month."),

    ("<b>Monthly PDF Export:</b>", "Teachers can export a NIELIT-branded landscape PDF with a "
     "calendar-style attendance grid showing 31 day columns, color-coded P/A/OFF markers, "
     "and a present count column."),

    ("<b>Role-Based Access Control:</b>", "JWT tokens issued by Supabase Auth carry user "
     "metadata including role information. The frontend uses protected routes, and the backend "
     "validates roles before executing sensitive operations."),

    ("<b>Mobile-Responsive Design:</b>", "The Student Portal is optimized for mobile phones, "
     "enabling students to scan QR codes using their device's camera. The camera interface uses "
     "the html5-qrcode library for cross-browser compatibility."),

    ("<b>Course-Based Organization:</b>", "Attendance is organized by course codes, allowing "
     "multiple teachers to manage different courses independently. Students are enrolled per "
     "course, and reports are generated per course."),

    ("<b>Attendance Finalization:</b>", "Teachers can finalize attendance for a given day, "
     "locking the records and preventing further modifications. This ensures data integrity "
     "for official reporting purposes."),
]

for title, desc in key_features_detailed:
    story.append(Paragraph(f"{title} {desc}", styles['BodyText2']))
    story.append(Spacer(1, 4))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 11. TESTING & DEPLOYMENT
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("11. Testing & Deployment", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("11.1 Testing Methodology", styles['SectionTitle']))

story.append(Paragraph(
    "The application was tested using a combination of manual testing, API testing, and "
    "cross-device testing to ensure reliability and correctness.",
    styles['BodyText2']))

test_cases = [
    [Paragraph('<b>Test Case</b>', styles['TableHeader']),
     Paragraph('<b>Expected Result</b>', styles['TableHeader']),
     Paragraph('<b>Status</b>', styles['TableHeader'])],
    [Paragraph('Student scans valid QR within 15s', styles['TableCell']),
     Paragraph('Attendance marked, timestamp recorded', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Student scans expired QR (>30s)', styles['TableCell']),
     Paragraph('Error: QR expired', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Same student scans twice same day', styles['TableCell']),
     Paragraph('Returns "already_marked"', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Student scans wrong course teacher QR', styles['TableCell']),
     Paragraph('Error: course_mismatch', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Teacher views monthly report', styles['TableCell']),
     Paragraph('Calendar grid with P/A/Weekend markers', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Export monthly PDF', styles['TableCell']),
     Paragraph('Landscape PDF with NIELIT branding', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Admin creates teacher + course', styles['TableCell']),
     Paragraph('Auth user + course record created', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Admin deletes student', styles['TableCell']),
     Paragraph('Student + auth user + profile removed', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
    [Paragraph('Mobile phone camera QR scanning', styles['TableCell']),
     Paragraph('Camera opens, successfully decodes QR', styles['TableCell']),
     Paragraph('<font color="#2e7d32">Pass</font>', styles['TableCell'])],
]

test_table = Table(test_cases, colWidths=[2.0 * inch, 2.2 * inch, 0.6 * inch])
test_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    *[('BACKGROUND', (0, i), (-1, i), TABLE_ALT if i % 2 == 0 else white) for i in range(1, len(test_cases))],
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
]))
story.append(test_table)
story.append(Paragraph("Table: Test Cases and Results", styles['Caption']))

story.append(Spacer(1, 10))
story.append(Paragraph("11.2 Deployment Architecture", styles['SectionTitle']))

story.append(Paragraph(
    "The application is deployed using a modern serverless architecture:",
    styles['BodyText2']))

deployment_items = [
    "<b>Frontend:</b> Built with Vite, deployed on Netlify via Git-based CI/CD. "
    "Every push to the main branch triggers automatic build and deployment.",
    "<b>Backend:</b> Supabase Edge Functions deployed on Supabase Cloud. Functions are "
    "written in TypeScript and run on Deno serverless runtime.",
    "<b>Database:</b> PostgreSQL hosted on Supabase Cloud with automatic backups, "
    "connection pooling, and Row Level Security policies.",
    "<b>Authentication:</b> Supabase Auth handles user registration, login, JWT token "
    "issuance, and password management. Tokens are verified on every API request.",
    "<b>Domain:</b> The application is accessible via a Netlify subdomain, making it "
    "available 24/7 from any device with internet access.",
]

for item in deployment_items:
    story.append(Paragraph(f"• {item}", styles['BulletItem']))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 12. OUTCOMES & KEY LEARNINGS
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("12. Outcomes & Key Learnings", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("12.1 Project Outcomes", styles['SectionTitle']))

outcomes = [
    "Successfully developed and deployed a fully functional QR-based attendance management system",
    "Eliminated the possibility of proxy attendance through 15-second rotating QR codes",
    "Achieved real-time attendance tracking with exact scan timestamps for audit purposes",
    "Built a multi-role system serving Admins, Teachers, and Students with appropriate access controls",
    "Implemented automated monthly report generation in both PDF and CSV formats",
    "Deployed the application on cloud infrastructure ensuring 24/7 accessibility",
    "Created a responsive web application that works seamlessly on both desktop and mobile devices",
    "Designed a scalable database schema supporting multiple courses, teachers, and students",
]

for outcome in outcomes:
    story.append(Paragraph(f"• {outcome}", styles['BulletItem']))

story.append(Spacer(1, 10))
story.append(Paragraph("12.2 Key Learnings", styles['SectionTitle']))

learnings = [
    ("<b>Supabase as a Backend Platform:</b>", " Gained hands-on experience with Supabase's "
     "comprehensive platform including Auth, PostgreSQL, Edge Functions, and Row Level Security. "
     "Learned how to leverage a Backend-as-a-Service for rapid application development."),

    ("<b>Serverless Architecture:</b>", " Understood the benefits and constraints of serverless "
     "computing through Supabase Edge Functions running on Deno. Learned about cold starts, "
     "execution limits, and stateless function design."),

    ("<b>React SPA Development:</b>", " Deepened knowledge of React component architecture, "
     "hooks (useState, useEffect, useRef), context management, and client-side routing with "
     "React Router v6."),

    ("<b>QR Code Technology:</b>", " Learned about QR code encoding, generation (using the "
     "'qrcode' library), and camera-based scanning (using 'html5-qrcode'). Understood the "
     "security implications and how time-validation prevents replay attacks."),

    ("<b>JWT Authentication:</b>", " Gained practical experience implementing token-based "
     "authentication, understanding token structure, expiry handling, and role-based "
     "authorization patterns."),

    ("<b>PDF Generation:</b>", " Learned client-side PDF generation using jsPDF, including "
     "manual layout calculations for landscape orientation, color management, font handling, "
     "and creating complex calendar-style grids without auto-table plugins."),

    ("<b>CI/CD & Deployment:</b>", " Gained experience with Netlify's automatic deployment "
     "pipeline triggered by Git pushes, environment variable management, and production "
     "build optimization with Vite."),

    ("<b>Database Design & Migrations:</b>", " Practiced incremental schema evolution through "
     "migration files, learned about constraint management, composite keys, and UUID-based "
     "user identification in Supabase."),
]

for title, desc in learnings:
    story.append(Paragraph(f"{title}{desc}", styles['BodyText2']))
    story.append(Spacer(1, 3))


# ═════════════════════════════════════════════════════════════
# 13. CHALLENGES FACED
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 8))
story.append(Paragraph("13. Challenges Faced", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

challenges = [
    ("<b>QR Timing Synchronization:</b>", " Ensuring accurate time comparison between the "
     "teacher's QR generation timestamp and the student's scan time required careful handling "
     "of clock differences between devices and the server."),

    ("<b>UUID-Integer Mapping:</b>", " Supabase Auth uses UUIDs for user IDs, while the students "
     "table originally used integer IDs. This required implementing a lookup mechanism via "
     "auth metadata (roll_number) to bridge the gap."),

    ("<b>Timezone Handling:</b>", " Scan timestamps stored in UTC needed proper conversion to "
     "IST (Indian Standard Time) for display in the Indian locale. JavaScript Date handling "
     "across timezones was a recurring challenge."),

    ("<b>PDF Layout Complexity:</b>", " Creating a calendar-style monthly grid in jsPDF required "
     "manual pixel-level layout calculations for 31+ columns, row heights, color fills, and "
     "text positioning — all without an auto-table plugin."),

    ("<b>Mobile Camera Access:</b>", " Modern browsers require HTTPS for camera access on mobile "
     "devices. During development, this required using Vite's SSL plugin and configuring proper "
     "host settings."),

    ("<b>Data Format Mismatches:</b>", " The backend API response format didn't directly match "
     "what the frontend components expected, requiring data transformation layers in the API "
     "client to bridge the gap."),

    ("<b>Database Schema Evolution:</b>", " As requirements evolved, the database schema needed "
     "multiple migrations to support features like per-course roll number uniqueness, multiple "
     "course enrollment, and email-based student lookup."),
]

for title, desc in challenges:
    story.append(Paragraph(f"{title}{desc}", styles['BodyText2']))
    story.append(Spacer(1, 3))

story.append(PageBreak())


# ═════════════════════════════════════════════════════════════
# 14. CONCLUSION & FUTURE SCOPE
# ═════════════════════════════════════════════════════════════

story.append(Paragraph("14. Conclusion & Future Scope", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

story.append(Paragraph("14.1 Conclusion", styles['SectionTitle']))

story.append(Paragraph(
    "The QR Attendance System developed during this NIELIT internship successfully demonstrates "
    "a modern, secure, and efficient approach to student attendance management. By leveraging "
    "dynamic QR codes with strict time validation, the system effectively eliminates the "
    "possibility of proxy attendance — a persistent problem with traditional methods.",
    styles['BodyText2']))

story.append(Paragraph(
    "The application provides a complete solution covering the entire attendance lifecycle: "
    "from user management and session creation to real-time marking, daily/monthly reporting, "
    "and PDF export. The three-portal architecture ensures that each user role — Administrator, "
    "Teacher, and Student — has a tailored interface optimized for their specific needs.",
    styles['BodyText2']))

story.append(Paragraph(
    "The project has been fully deployed on cloud infrastructure (Netlify + Supabase), making "
    "it accessible from any device with internet connectivity. The serverless architecture "
    "ensures low operational costs while maintaining reliability and scalability.",
    styles['BodyText2']))

story.append(Paragraph(
    "This internship provided invaluable hands-on experience in full-stack web development, "
    "modern cloud services, database design, and production deployment — skills that are "
    "directly applicable to industry software development.",
    styles['BodyText2']))

story.append(Spacer(1, 10))
story.append(Paragraph("14.2 Future Scope", styles['SectionTitle']))

future_items = [
    "<b>Biometric Integration:</b> Adding fingerprint or face recognition as an additional verification layer",
    "<b>Geofencing:</b> Using GPS coordinates to ensure students are physically within the classroom",
    "<b>Analytics Dashboard:</b> Charts and graphs showing attendance trends, peak times, and patterns",
    "<b>Push Notifications:</b> Alerting students about attendance sessions and low attendance warnings",
    "<b>Multi-Institution Support:</b> Extending the system to support multiple NIELIT centres",
    "<b>Offline Mode:</b> Allowing attendance marking when internet connectivity is temporarily unavailable",
    "<b>Integration APIs:</b> Connecting with institutional ERP systems for unified student management",
    "<b>Automated Reports:</b> Scheduled email delivery of monthly attendance reports to administrators",
]

for item in future_items:
    story.append(Paragraph(f"• {item}", styles['BulletItem']))


# ═════════════════════════════════════════════════════════════
# 15. REFERENCES
# ═════════════════════════════════════════════════════════════

story.append(Spacer(1, 20))
story.append(Paragraph("15. References", styles['ChapterTitle']))
story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=15))

references = [
    "React Official Documentation — https://react.dev/",
    "Supabase Documentation — https://supabase.com/docs",
    "Vite Build Tool — https://vitejs.dev/",
    "jsPDF Library — https://github.com/parallax/jsPDF",
    "html5-qrcode — https://github.com/mebjas/html5-qrcode",
    "QRCode.js — https://github.com/soldair/node-qrcode",
    "React Router v6 — https://reactrouter.com/",
    "Deno Runtime — https://deno.land/",
    "PostgreSQL Documentation — https://www.postgresql.org/docs/",
    "Netlify Deployment Documentation — https://docs.netlify.com/",
    "MDN Web Docs: MediaDevices.getUserMedia() — https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia",
    "NIELIT Official Website — https://nielit.gov.in/",
]

for i, ref in enumerate(references, 1):
    story.append(Paragraph(f"[{i}] {ref}", ParagraphStyle(
        f'ref{i}', parent=styles['BodyText2'], fontSize=10, leftIndent=25, firstLineIndent=-25)))


# ── Build PDF ────────────────────────────────────────────────
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

print(f"Report saved to: {output_path}")

# Count approximate pages
import subprocess
print("Report generated successfully!")
