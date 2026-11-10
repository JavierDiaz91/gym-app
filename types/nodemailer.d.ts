declare module "nodemailer" {
  const nodemailer: {
    createTransport(options: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }): {
      sendMail(options: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
    };
  };
  export default nodemailer;
}
