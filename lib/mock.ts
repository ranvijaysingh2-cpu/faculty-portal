import type { PdfRecord } from "./csv";

type Role = "faculty" | "center_head" | "region_head";

const MOCK_PDFS: PdfRecord[] = [
  // UP Region → Lucknow Center → JEE Mains Batch A
  { region: "UP Region", center: "Lucknow Center", batch: "JEE Mains Batch A", test_date: "2024-11-10", pdf_name: "JEE_Mains_Mock_Test_1.pdf", gdrive_link: "https://drive.google.com/file/d/example1" },
  { region: "UP Region", center: "Lucknow Center", batch: "JEE Mains Batch A", test_date: "2024-11-10", pdf_name: "JEE_Mains_Mock_Test_1_Solutions.pdf", gdrive_link: "https://drive.google.com/file/d/example2" },
  { region: "UP Region", center: "Lucknow Center", batch: "JEE Mains Batch A", test_date: "2024-11-10", pdf_name: "JEE_Mains_Mock_Test_1_OMR.pdf", gdrive_link: "https://drive.google.com/file/d/example3" },
  { region: "UP Region", center: "Lucknow Center", batch: "JEE Mains Batch A", test_date: "2024-11-17", pdf_name: "JEE_Mains_Mock_Test_2.pdf", gdrive_link: "https://drive.google.com/file/d/example4" },
  { region: "UP Region", center: "Lucknow Center", batch: "JEE Mains Batch A", test_date: "2024-11-17", pdf_name: "JEE_Mains_Mock_Test_2_Solutions.pdf", gdrive_link: "https://drive.google.com/file/d/example5" },
  // UP Region → Lucknow Center → NEET Batch B
  { region: "UP Region", center: "Lucknow Center", batch: "NEET Batch B", test_date: "2024-11-12", pdf_name: "NEET_Mock_Test_1.pdf", gdrive_link: "https://drive.google.com/file/d/example6" },
  { region: "UP Region", center: "Lucknow Center", batch: "NEET Batch B", test_date: "2024-11-12", pdf_name: "NEET_Mock_Test_1_Solutions.pdf", gdrive_link: "https://drive.google.com/file/d/example7" },
  { region: "UP Region", center: "Lucknow Center", batch: "NEET Batch B", test_date: "2024-11-19", pdf_name: "NEET_Mock_Test_2.pdf", gdrive_link: "https://drive.google.com/file/d/example8" },
  // UP Region → Kanpur Center → JEE Advanced Batch
  { region: "UP Region", center: "Kanpur Center", batch: "JEE Advanced Batch", test_date: "2024-11-14", pdf_name: "JEE_Advanced_Full_Test_1.pdf", gdrive_link: "https://drive.google.com/file/d/example9" },
  { region: "UP Region", center: "Kanpur Center", batch: "JEE Advanced Batch", test_date: "2024-11-14", pdf_name: "JEE_Advanced_Full_Test_1_Solutions.pdf", gdrive_link: "https://drive.google.com/file/d/example10" },
  { region: "UP Region", center: "Kanpur Center", batch: "JEE Advanced Batch", test_date: "2024-11-21", pdf_name: "JEE_Advanced_Full_Test_2.pdf", gdrive_link: "https://drive.google.com/file/d/example11" },
  // Delhi Region → South Delhi Center → Foundation Batch
  { region: "Delhi Region", center: "South Delhi Center", batch: "Foundation Batch", test_date: "2024-11-15", pdf_name: "Foundation_Test_1.pdf", gdrive_link: "https://drive.google.com/file/d/example12" },
  { region: "Delhi Region", center: "South Delhi Center", batch: "Foundation Batch", test_date: "2024-11-15", pdf_name: "Foundation_Test_1_Solutions.pdf", gdrive_link: "https://drive.google.com/file/d/example13" },
  { region: "Delhi Region", center: "North Delhi Center", batch: "JEE Mains Batch C", test_date: "2024-11-16", pdf_name: "JEE_Mains_C_Test_1.pdf", gdrive_link: "https://drive.google.com/file/d/example14" },
];

const ROLE_CONFIG: Record<Role, { scopeValue: string; name: string }> = {
  region_head: { scopeValue: "UP Region", name: "Rajesh Kumar" },
  center_head:  { scopeValue: "Lucknow Center", name: "Priya Sharma" },
  faculty:      { scopeValue: "JEE Mains Batch A", name: "Amit Singh" },
};

export function mockMyPdfs() {
  const role = (process.env.DEV_ROLE ?? "region_head") as Role;
  const { scopeValue, name } = ROLE_CONFIG[role] ?? ROLE_CONFIG.region_head;

  const pdfs = MOCK_PDFS.filter((p) => {
    if (role === "region_head") return p.region === scopeValue;
    if (role === "center_head") return p.center === scopeValue;
    return p.batch === scopeValue;
  });

  return {
    role,
    scopeValue,
    pdfs,
    user: {
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@pw.live`,
      image: null,
    },
  };
}
