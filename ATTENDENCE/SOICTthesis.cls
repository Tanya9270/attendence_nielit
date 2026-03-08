%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%         Gautam Buddha University, Greater Noida, Utter Pradesh 
%                      https://gbu.ac.in
%          SOICT M.Tech  Thesis Template — Custom LaTeX Class
%         Created by: [Your Name] — Share & Improve via GitHub
%   
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{SOICTthesis}[2025/03/10 Custom Thesis Class for SOICT]

\usepackage{algorithm}
\usepackage{algpseudocode} 
\usepackage{float}
\usepackage{amsmath}
% ----- Load Base Class -----
\LoadClass[a4paper,12pt]{report}  % Report class is suitable for theses
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}
% ----- Required Packages -----
\RequirePackage[left=2.5cm, right=1.5cm, top=1in, bottom=1in]{geometry} % Margins
\RequirePackage{titlesec}   % Formatting chapters and sections
\RequirePackage{setspace}   % Line spacing
\RequirePackage{fancyhdr}   % Headers and footers
\RequirePackage{graphicx}   % Image handling
\RequirePackage{hyperref}   % Clickable links
\RequirePackage{xcolor}     % Colors
\RequirePackage{tocloft}    % Customizing TOC
\RequirePackage{longtable}  % Multi-page tables (used for abbreviations)
\RequirePackage{lipsum}     % Dummy text (for testing)
\RequirePackage{times}      % Uses Times New Roman equivalent
\onehalfspacing             % 1.5 line spacing
\RequirePackage{ragged2e}  % Better justification

\AtBeginDocument{
    \justifying  % ✅ Ensures text justification
}

% ----- Title Page Commands -----
\newcommand{\thesistitle}[1]{\def\@thesistitle{#1}}
\newcommand{\authorname}[1]{\def\@authorname{#1}}
\newcommand{\degree}[1]{\def\@degree{#1}}
\newcommand{\program}[1]{\def\@program{#1}}
\newcommand{\specialization}[1]{\def\@specialization{#1}} % Specialization
\newcommand{\university}[1]{\def\@university{#1}}
\newcommand{\submissiondate}[1]{\def\@submissiondate{#1}}
\newcommand{\enrollmentno}[1]{\def\@enrollmentno{#1}}
\newcommand{\supervisor}[2]{%
    \def\@supervisor{#1}%
    \def\@supervisordesignation{#2}%
}

\def\@program{Not Specified}
\def\@specialization{Not Specified}
\def\@university{Not Specified}
\def\@submissiondate{Not Specified}
\def\@supervisordesignation{Not Specified}


\renewcommand{\maketitle}{
    \begin{titlepage}
        \centering
        \vspace{0.5in}
        {\Large \bfseries \MakeUppercase\@thesistitle \par}
        \vspace{0.3cm}
        {\large \textit{An internship project report submitted for partial fulfillment of the requirements of the} \par}
        \vspace{0.15cm}
        {\large \textbf{\@degree} \par}
        \vspace{0.1cm}
        {\large IN \par}
        \vspace{0.1cm}
        {\large \textbf{\@program} \par}
        \vspace{0.3cm}
        {\large \textbf{\MakeUppercase{(Specialization: \@specialization)}} \par}
        \vspace{0.3cm}

        \includegraphics[width=4.5cm]{Assets/NIELIT_logo.jpg}

        \vspace{0.3cm}
        {\large \textbf{\MakeUppercase{Submitted by:} \\ \MakeUppercase{\@authorname}} \par}
        {\large \textbf{Enrollment No: \@enrollmentno} \par}
        \vspace{0.5cm}
        {\large \textbf{SUPERVISED BY:} \\ \MakeUppercase{\textbf{\@supervisor}} \\ \textbf{\@supervisordesignation} \par}
        \vfill
        {\large \textbf{\MakeUppercase{
          National Institute of Electronics and \\
          Information Technology (NIELIT) \\
          Gorakhpur Centre, U.P. \\
          }} \par}
        {\large \textbf{\@submissiondate} \par}
    \end{titlepage}
}

\newcommand{\candidateDeclaration}{
    \newpage

    \begin{center}
        \begin{minipage}{0.2\textwidth}  % Logo area
            \includegraphics[width=3cm]{Assets/NIELIT_logo.jpg}  % NIELIT logo
        \end{minipage}%
        \begin{minipage}{0.75\textwidth}  % Text area
            \centering  % ✅ Centers the text within the minipage
            \singlespacing  % ✅ Set line spacing to 1
            {\large \textbf{\MakeUppercase{National Institute of Electronics and Information Technology}}\\}
            {\large \textbf{\MakeUppercase{(NIELIT)}}\\}
            {\large \textbf{\MakeUppercase{Gorakhpur Centre, Uttar Pradesh, India}}\\}
            {\large \textbf{\MakeUppercase{\@submissiondate}}\\}
        \end{minipage}
    \end{center}
    \vspace{0.5cm}
    \begin{center}
        \textbf{\large CANDIDATE DECLARATION}
    \end{center}


    \noindent I hereby certify that the work embodied in this project report entitled
    ``\textbf{\@thesistitle}", by \textbf{\@authorname}, Enrollment No. \textbf{\@enrollmentno} in partial fulfillment of the requirement for the completion of the
    \textbf{\@degree} in \textbf{\@program} with specialization in \textbf{\@specialization} submitted to
    \@university, is an authentic record of my own work carried out under the supervision of
    \textbf{\@supervisor}. The matter presented in this report has not been submitted by anyone in any other university/institute for the award of any other degree or diploma.
    Responsibility for any plagiarism-related issue stands solely with me.

    \vspace{1cm}  % ✅ Reduced spacing

    \noindent
    \textbf{Signature of the Student} \hfill \textbf{\@authorname}  

    \vspace{1cm}

    \noindent This is to certify that the above statement made by the candidate is correct to the best of my knowledge and belief. 
    However, responsibility for any plagiarism-related issue solely stands with the student.

    \vspace{1cm}  % ✅ Reduced spacing

    \noindent
    \textbf{\@supervisor} \hfill \textbf{Signature of the Supervisor}\\
    \@supervisordesignation\\
    \@university.\\

    \vfill

    \noindent
    \textbf{Date:} \underline{\hspace{3cm}} \\[0.2cm]
    \textbf{Place:} Gorakhpur, India.
}

% ----- Acknowledgement Page -----
\newcommand{\acknowledgement}{
    \newpage
    \thispagestyle{plain}  % Page number at the bottom

    \begin{center}
        \textbf{\Large ACKNOWLEDGEMENTS}
    \end{center}
    \vspace{1cm}
    \noindent
    While working on this internship project, I came across a number of people whose contributions in various ways helped me and they deserve special thanks. It is a pleasure to convey my gratitude to all of them.
    First and primarily, I would like to acknowledge and express my gratitude towards my supervisor, \textbf{\@supervisor}, for the guidance and assistance in the development of this project. The necessary suggestions provided helped guide me and saved me a lot of time. I would also like to express thanks for accepting me as an intern and giving me the opportunity to work in a way that highly motivates.

    \vspace{0.5cm}
    I specially acknowledge the advice, supervision, and the vital contributions as and when required during this internship. I am proud to record that I had the opportunity to work with an experienced mentor. The knowledge shared will remain in my memory for years to come.

    \vspace{0.5cm}
    I would also like to thank \textbf{\@university} for giving me the opportunity to work on this project. The resources and support provided by the institute were instrumental in the successful completion of this work.

    \vspace{1.5cm}

    \begin{flushright}
        \textbf{\@authorname} \\  % Auto-fill author name
        \@enrollmentno  % Auto-fill enrollment number
    \end{flushright}
}


\newcommand{\generateFrontMatter}{%
  \pagenumbering{roman}
  \maketitle
  \candidateDeclaration
  \acknowledgement
  \startTOC
}
% ----- Abstract Page -----
\newcommand{\theabstract}[1]{%
  \generateFrontMatter
    \clearpage 
    \thispagestyle{plain} 
    \begin{center}
        \textbf{\Large ABSTRACT}
    \end{center}
    \vspace{1cm}
    \justifying
    \noindent
    #1
    \vspace{1in}
}


% ----- Table of Contents, List of Abbreviations, Figures, and Tables Formatting -----
\renewcommand{\contentsname}{}
\newcommand{\startTOC}{%
    \newpage
    \thispagestyle{plain}
    \begin{center}
        \Large\bfseries TABLE OF CONTENTS % Centered Title
    \end{center}
    \vspace{-1cm}
    \tableofcontents
    \newpage
    \startAbbreviations
    \newpage
    \startLOF
    \newpage
    \startLOT
}

% ----- TOC Entry Formatting -----
\renewcommand{\cftchapaftersnum}{\MakeUppercase}  
\renewcommand{\cftchapdotsep}{\cftdotsep}        
\renewcommand{\cftchapleader}{\cftdotfill{\cftdotsep}}  
\renewcommand{\cftchapnumwidth}{2em}  

% ----- Section Formatting in TOC -----
\renewcommand{\cftsecindent}{1.5em}  
\renewcommand{\cftsecnumwidth}{3em}  
\renewcommand{\cftsecdotsep}{\cftdotsep}  

% ----- Subsection Formatting in TOC -----
\renewcommand{\cftsubsecindent}{3em}  
\renewcommand{\cftsubsecnumwidth}{4em}  
\renewcommand{\cftsubsecdotsep}{\cftdotsep}  

% ----- List of Abbreviations -----
\newcommand{\startAbbreviations}{%
    \newpage
    \thispagestyle{plain}
    \begin{center}
        \Large\bfseries LIST OF ABBREVIATIONS
    \end{center}
    \vspace{0.3cm}
    \begin{longtable}{|p{3.2cm}|p{11.5cm}|}
    \hline
    \textbf{Abbreviation} & \textbf{Full Form} \\ \hline
    \textbf{API}      & Application Programming Interface \\ \hline
    \textbf{CI/CD}    & Continuous Integration / Continuous Deployment \\ \hline
    \textbf{CORS}     & Cross-Origin Resource Sharing \\ \hline
    \textbf{CRUD}     & Create, Read, Update, Delete \\ \hline
    \textbf{CSS}      & Cascading Style Sheets \\ \hline
    \textbf{CSV}      & Comma-Separated Values \\ \hline
    \textbf{DB}       & Database \\ \hline
    \textbf{HMR}      & Hot Module Replacement \\ \hline
    \textbf{HTML}     & Hypertext Markup Language \\ \hline
    \textbf{IST}      & Indian Standard Time \\ \hline
    \textbf{JS}       & JavaScript \\ \hline
    \textbf{JSON}     & JavaScript Object Notation \\ \hline
    \textbf{JSX}      & JavaScript XML \\ \hline
    \textbf{JWT}      & JSON Web Token \\ \hline
    \textbf{NIELIT}   & National Institute of Electronics and Information Technology \\ \hline
    \textbf{PDF}      & Portable Document Format \\ \hline
    \textbf{PK}       & Primary Key \\ \hline
    \textbf{QR}       & Quick Response (Code) \\ \hline
    \textbf{RBAC}     & Role-Based Access Control \\ \hline
    \textbf{RLS}      & Row Level Security \\ \hline
    \textbf{RPC}      & Remote Procedure Call \\ \hline
    \textbf{SDK}      & Software Development Kit \\ \hline
    \textbf{SPA}      & Single Page Application \\ \hline
    \textbf{SQL}      & Structured Query Language \\ \hline
    \textbf{UI}       & User Interface \\ \hline
    \textbf{UUID}     & Universally Unique Identifier \\ \hline
    \end{longtable}
}

% ----- List of Figures -----
\newcommand{\startLOF}{%
    \newpage
    \renewcommand{\listfigurename}{} 
    \thispagestyle{plain}
    \begin{center}
        \Large\bfseries LIST OF FIGURES
    \end{center}
    \vspace{-2cm}
    \listoffigures
}

% ----- List of Tables -----
\newcommand{\startLOT}{%
    \newpage
    \renewcommand{\listtablename}{} 
    \thispagestyle{plain}
    \begin{center}
        \Large\bfseries LIST OF TABLES
    \end{center}
    \vspace{-2cm}
    \listoftables
}

% ----- Custom Chapter Formatting -----
\titleformat{\chapter}[display]
  {\normalfont\Huge\bfseries\centering}
  {CHAPTER-\thechapter}{0pt}{\Huge\bfseries\centering\MakeUppercase}
\titlespacing*{\chapter}{0pt}{\fill}{\fill}
\let\oldchapter\chapter
\renewcommand{\chapter}[1]{
    \clearpage
    \ifnum\value{chapter}=0
        \pagenumbering{arabic}
        \setcounter{page}{1} 
    \fi
    \oldchapter{#1}
    \thispagestyle{empty}
    \clearpage
    \thispagestyle{plain}
}

% Biblography Formatting
\RequirePackage{etoolbox}  % Needed for \patchcmd
\makeatletter
\renewcommand{\bibname}{REFERENCES} % Changes "Bibliography" to "REFERENCES" and centers it
\patchcmd{\thebibliography}{\chapter*}{\section*}{}{}
\makeatother
% ------ MISC changes ___________

% ----- End of Class -----
\endinput


