import { buildExport, toCsv } from '@eventflow/db';
import { requirePermission, AuthError } from '@/lib/auth';

function slugifyName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'evento';
}

/** Exporta los registros a CSV o Excel (PRD M10). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('report:export');
    if (!user.tenantId) return new Response('Sin tenant', { status: 403 });
    const { id } = await params;
    const format = new URL(req.url).searchParams.get('format') ?? 'csv';

    const data = await buildExport(user.tenantId, id);
    if (!data) return new Response('Evento no encontrado', { status: 404 });

    const filename = `${slugifyName(data.title)}-registros`;

    if (format === 'xlsx') {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Registros');
      ws.addRow(data.columns);
      ws.getRow(1).font = { bold: true };
      data.rows.forEach((r) => ws.addRow(r));
      ws.columns.forEach((c) => (c.width = 22));
      const buffer = await wb.xlsx.writeBuffer();
      return new Response(buffer, {
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    const csv = '\uFEFF' + toCsv(data.columns, data.rows); // BOM para acentos en Excel
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    console.error('[export] error:', e);
    return new Response('Error interno', { status: 500 });
  }
}
