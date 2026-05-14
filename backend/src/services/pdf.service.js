import PDFDocument from "pdfkit";

const collect = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

export const pdfService = {
  async invoice(order, title = "GST Invoice") {
    const doc = new PDFDocument({ margin: 40 });
    const done = collect(doc);
    doc.fontSize(18).text(title);
    doc.moveDown().fontSize(10).text(`Order: ${order.orderNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.moveDown();
    order.items.forEach((item) => {
      doc.text(`${item.name} x ${item.quantity} @ ${item.unitPrice} = ${item.lineTotal}`);
    });
    doc.moveDown();
    doc.text(`Subtotal: ${order.subtotal}`);
    doc.text(`Discount: ${order.discount}`);
    doc.text(`GST/Tax: ${order.taxAmount}`);
    doc.fontSize(14).text(`Grand Total: ${order.grandTotal}`);
    doc.end();
    return done;
  },
};
