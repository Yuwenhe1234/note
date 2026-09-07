using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class Shot {
  [STAThread]
  static int Main(string[] args) {
    int x = int.Parse(args[0]);
    int y = int.Parse(args[1]);
    int w = int.Parse(args[2]);
    int h = int.Parse(args[3]);
    string path = args[4];
    using (var bmp = new Bitmap(w, h)) {
      using (var g = Graphics.FromImage(bmp)) {
        g.CopyFromScreen(x, y, 0, 0, bmp.Size);
        bmp.Save(path, ImageFormat.Png);
      }
    }
    Console.WriteLine("Saved: " + path);
    return 0;
  }
}