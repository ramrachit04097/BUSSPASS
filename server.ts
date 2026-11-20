import 'dotenv/config';
import express from 'express';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const CGI_BINARY = path.join(ROOT_DIR, 'cgi-bin', 'buspass.cgi');

function ensureCgiBinary() {
  if (!fs.existsSync(CGI_BINARY)) {
    fs.mkdirSync(path.join(ROOT_DIR, 'cgi-bin'), { recursive: true });
    execSync(
      'gcc -Wall -Wextra -O2 backend/buspass.c -o cgi-bin/buspass.cgi && chmod +x cgi-bin/buspass.cgi',
      { cwd: ROOT_DIR, stdio: 'inherit' }
    );
  }
}

async function startServer() {
  ensureCgiBinary();

  const app = express();

  // Thin CGI gateway: delegates all requests to the compiled C binary (cgi-bin/buspass.cgi)
  app.all('/cgi-bin/buspass.cgi', (req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      const rawUrl = req.originalUrl || '';
      const qIdx = rawUrl.indexOf('?');
      const queryString = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';

      const child = spawn(CGI_BINARY, [], {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          GATEWAY_INTERFACE: 'CGI/1.1',
          REQUEST_METHOD: req.method,
          QUERY_STRING: queryString,
          CONTENT_LENGTH: String(bodyBuffer.length),
          CONTENT_TYPE: String(req.headers['content-type'] || 'application/x-www-form-urlencoded'),
          SCRIPT_NAME: '/cgi-bin/buspass.cgi',
        },
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      child.on('error', (err) => {
        res.status(500).json({
          success: false,
          error: `Failed to execute C CGI binary: ${err.message}`,
        });
      });

      child.on('close', (code) => {
        const rawOut = Buffer.concat(stdoutChunks).toString('utf8');
        if (code !== 0 && !rawOut) {
          const errOut = Buffer.concat(stderrChunks).toString('utf8');
          res.status(500).json({
            success: false,
            error: errOut || `CGI process exited with status ${code}`,
          });
          return;
        }

        const crlfSplit = rawOut.indexOf('\r\n\r\n');
        const lfSplit = rawOut.indexOf('\n\n');
        let headerPart = '';
        let bodyPart = rawOut;

        if (crlfSplit !== -1) {
          headerPart = rawOut.slice(0, crlfSplit);
          bodyPart = rawOut.slice(crlfSplit + 4);
        } else if (lfSplit !== -1) {
          headerPart = rawOut.slice(0, lfSplit);
          bodyPart = rawOut.slice(lfSplit + 2);
        }

        headerPart.split(/\r?\n/).forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            res.setHeader(key, val);
          }
        });

        res.status(200).send(bodyPart);
      });

      if (bodyBuffer.length > 0) {
        child.stdin.write(bodyBuffer);
      }
      child.stdin.end();
    });
  });

  const TICKETS_DIR = path.join(ROOT_DIR, 'data', 'tickets');

  app.use('/api/tickets', express.json({ limit: '5mb' }));

  app.get('/api/tickets/verify', async (req, res) => {
    const appIdNum = Number(String(req.query.appId || '0').replace(/\D/g, ''));
    const studentId = String(req.query.studentId || '').trim().toUpperCase();

    let supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
      const ref = supabaseUrl.split('/project/')[1]?.split('/')[0]?.trim();
      if (ref) supabaseUrl = `https://${ref}.supabase.co`;
    }

    let record: Record<string, unknown> | null = null;

    if (supabaseUrl && supabaseAnonKey && (appIdNum > 0 || studentId)) {
      try {
        const filter =
          appIdNum > 0
            ? `application_id=eq.${appIdNum}`
            : `student_id=ilike.${encodeURIComponent(studentId)}`;
        const sbRes = await fetch(
          `${supabaseUrl}/rest/v1/bus_passes?select=*&${filter}&limit=1`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );
        if (sbRes.ok) {
          const rows = (await sbRes.json()) as Array<Record<string, unknown>>;
          if (rows && rows.length > 0) {
            const d = rows[0];
            record = {
              applicationID: d.application_id,
              studentID: d.student_id || '',
              name: d.name || '',
              department: d.department || '',
              contact: d.contact || '',
              email: d.email || '',
              route: d.route || '',
              boardingPoint: d.boarding_point || '',
              passType: d.pass_type || '',
              validity: d.validity || '',
              status: d.status || 'Pending',
              ticketPhoto: d.ticket_photo || undefined,
            };
          }
        }
      } catch {
        // Fallback to local saved ticket store below
      }
    }

    const cleanId = appIdNum > 0 ? String(appIdNum) : '';
    if (cleanId) {
      const filePath = path.join(TICKETS_DIR, `pass-${cleanId}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (record && !record.ticketPhoto && parsed?.ticketPhoto) {
            record.ticketPhoto = parsed.ticketPhoto;
          }
        } catch {
          // Ignore corrupted cache file
        }
      }
    }

    if (!record) {
      res.status(404).json({ success: false, error: 'Pass not found' });
      return;
    }

    res.json({ success: true, pass: record });
  });

  app.post('/api/tickets/:appId', (req, res) => {
    const cleanId = String(req.params.appId || '').replace(/\D/g, '');
    const ticketPhoto = typeof req.body?.ticketPhoto === 'string' ? req.body.ticketPhoto : '';
    const studentID = typeof req.body?.studentID === 'string' ? req.body.studentID : '';
    if (!cleanId || !ticketPhoto.startsWith('data:image/')) {
      res.status(400).json({ success: false, error: 'Invalid ticket photo payload.' });
      return;
    }
    try {
      fs.mkdirSync(TICKETS_DIR, { recursive: true });
      const filePath = path.join(TICKETS_DIR, `pass-${cleanId}.json`);
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          applicationID: Number(cleanId),
          studentID,
          ticketPhoto,
          savedAt: new Date().toISOString(),
        }),
        'utf8'
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to store ticket photo.',
      });
    }
  });

  app.get('/api/tickets/:appId', (req, res) => {
    const cleanId = String(req.params.appId || '').replace(/\D/g, '');
    if (!cleanId) {
      res.status(400).json({ success: false, error: 'Invalid application ID.' });
      return;
    }
    const filePath = path.join(TICKETS_DIR, `pass-${cleanId}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Ticket photo not found.' });
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json({ success: true, ...parsed });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to read ticket photo.' });
    }
  });

  app.get('/api/tickets/:appId/image.png', (req, res) => {
    const cleanId = String(req.params.appId || '').replace(/\D/g, '');
    if (!cleanId) {
      res.status(400).send('Invalid ID');
      return;
    }
    const filePath = path.join(TICKETS_DIR, `pass-${cleanId}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Not found');
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const dataUrl: string = parsed.ticketPhoto || '';
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        res.status(404).send('Image unavailable');
        return;
      }
      const buffer = Buffer.from(base64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(buffer);
    } catch {
      res.status(500).send('Error reading ticket image');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BUSPASS HTTP-to-CGI Gateway running on http://localhost:${PORT}`);
  });
}

startServer();
