// ============================================================
//  LO QUIERO! — Google Apps Script | apps-script.gs
//
//  INSTRUCCIONES DE CONFIGURACIÓN:
//  1. Abrí tu Google Sheets
//  2. Extensiones → Apps Script
//  3. Pegá TODO este código (reemplazá cualquier contenido previo)
//  4. Guardá (Ctrl+S)
//  5. Implementar → Nueva implementación
//     - Tipo: Aplicación web
//     - Ejecutar como: Yo (tu cuenta de Google)
//     - Quién puede acceder: Cualquier persona
//  6. Autorizar los permisos cuando te pida
//  7. Copiá la URL generada y pegala en script.js → GOOGLE_SHEETS_URL
// ============================================================

// Nombre de la hoja donde se guardarán las interacciones
const SHEET_NAME = 'Interacciones';

// Nombre de la hoja donde se guardan los productos (opcional)
const SHEET_PRODUCTOS = 'Productos';

// ---- Columnas de la hoja Interacciones ----
// Timestamp | Tipo | Producto | Precio | Detalle | UserAgent

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    
    // Crear hoja si no existe
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Cabecera
      sheet.appendRow(['Timestamp', 'Tipo', 'Producto', 'Precio', 'Detalle', 'User Agent']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#E85002').setFontColor('white');
      sheet.setFrozenRows(1);
    }

    // Agregar fila con la interacción
    sheet.appendRow([
      data.timestamp  || new Date().toLocaleString('es-AR'),
      data.tipo       || '',
      data.producto   || '',
      data.precio     || '',
      data.detalle    || '',
      data.userAgent  || '',
    ]);

    // Auto-ajustar columnas
    sheet.autoResizeColumns(1, 6);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET: para verificar que el script funciona
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'LO QUIERO! Apps Script activo ✅' }))
    .setMimeType(ContentService.MimeType.JSON);
}
