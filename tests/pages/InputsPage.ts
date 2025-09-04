import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../utils/BasePage';

interface IngresoFormData {
    camion: string;
    remito: string;
    proveedor: string;
    sustrato: string;
    cantidad: string;
    lugarDescarga: string;
}

export class InputsPage extends BasePage {
  readonly camionSelect: Locator;
  readonly remitoInput: Locator;
  readonly proveedorSelect: Locator;
  readonly sustratoSelect: Locator;
  readonly cantidadInput: Locator;
  readonly lugarDescargaSelect: Locator;
  readonly registrarButton: Locator;

  constructor(page: Page) {
    super(page, '/#/inputs');
    this.camionSelect = page.locator('select[name="camion_id"]');
    this.remitoInput = page.locator('input[name="remito"]');
    this.proveedorSelect = page.locator('select[name="provider"]');
    this.sustratoSelect = page.locator('select[name="substrate"]');
    this.cantidadInput = page.locator('input[name="quantity"]');
    this.lugarDescargaSelect = page.locator('select[name="location"]');
    this.registrarButton = page.getByRole('button', { name: 'Registrar Ingreso' });
  }

  async fillForm(data: IngresoFormData): Promise<void> {
    await this.camionSelect.selectOption({ label: data.camion });
    await this.remitoInput.fill(data.remito);
    await this.proveedorSelect.selectOption({ label: data.proveedor });
    await this.sustratoSelect.selectOption({ label: data.sustrato });
    await this.cantidadInput.fill(data.cantidad);
    await this.lugarDescargaSelect.selectOption({ label: data.lugarDescarga });
  }

  async submitForm(): Promise<void> {
    await this.registrarButton.click();
  }
}
