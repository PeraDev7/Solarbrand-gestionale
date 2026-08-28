// Local type declarations for jspdf and jspdf-autotable
// Needed because npm cannot properly extract packages on Google Drive filesystem.

declare module "jspdf" {
  interface jsPDFOptions {
    orientation?: "portrait" | "landscape" | "p" | "l";
    unit?: "pt" | "px" | "in" | "mm" | "cm" | "ex" | "em" | "pc";
    format?: string | number[];
  }

  interface TextOptionsLight {
    align?: "left" | "center" | "right" | "justify";
    baseline?: string;
    angle?: number;
    maxWidth?: number;
  }

  class jsPDF {
    internal: {
      pageSize: { getWidth(): number; getHeight(): number };
      getNumberOfPages(): number;
    };
    lastAutoTable: { finalY: number };
    constructor(options?: jsPDFOptions);
    setFillColor(r: number, g: number, b: number): this;
    setDrawColor(r: number, g: number, b: number): this;
    setTextColor(r: number, g: number, b: number): this;
    setFontSize(size: number): this;
    setFont(fontName: string, fontStyle?: string): this;
    setPage(pageNumber: number): this;
    rect(x: number, y: number, w: number, h: number, style?: string): this;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): this;
    circle(x: number, y: number, r: number, style?: string): this;
    text(text: string | string[], x: number, y: number, options?: TextOptionsLight): this;
    addPage(format?: string | number[], orientation?: string): this;
    save(filename: string): this;
    getNumberOfPages(): number;
  }

  export default jsPDF;
}

declare module "jspdf-autotable" {
  import jsPDF from "jspdf";

  interface Styles {
    font?: string;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    overflow?: "linebreak" | "ellipsize" | "visible" | "hidden";
    fillColor?: [number, number, number] | false;
    textColor?: [number, number, number];
    halign?: "left" | "center" | "right" | "justify";
    valign?: "top" | "middle" | "bottom";
    fontSize?: number;
    cellPadding?: number | object;
    lineColor?: [number, number, number];
    lineWidth?: number;
    cellWidth?: "auto" | "wrap" | number;
  }

  interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    rowPageBreak?: "auto" | "avoid";
    theme?: "striped" | "grid" | "plain" | "css";
    showHead?: "everyPage" | "firstPage" | "never";
    styles?: Partial<Styles>;
    headStyles?: Partial<Styles>;
    bodyStyles?: Partial<Styles>;
    alternateRowStyles?: Partial<Styles>;
    columnStyles?: { [key: number]: Partial<Styles> };
    didDrawPage?: (data: { pageNumber: number; pageCount: number; settings: any; table: any; cursor: any }) => void;
    didDrawCell?: (data: any) => void;
    willDrawCell?: (data: any) => void;
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}

// imapflow — used server-side for IMAP reply detection
declare module 'imapflow' {
  export class ImapFlow {
    constructor(options: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
      logger?: any;
    });
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(mailbox: string): Promise<{ release: () => void }>;
    fetch(range: string, query: any): AsyncIterable<any>;
    fetchOne(seq: string, query: any): Promise<any>;
  }
}
