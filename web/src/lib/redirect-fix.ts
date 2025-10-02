// Utilitário para corrigir redirecionamentos infinitos
export class RedirectFix {
  private static readonly MAIN_DOMAIN = 'starvibe.space';
  private static readonly WWW_DOMAIN = 'www.starvibe.space';

  /**
   * Verifica se há redirecionamento infinito e corrige
   */
  static checkAndFixRedirects(): void {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // Se estiver em www.starvibe.space, redireciona para starvibe.space
    if (currentHost === this.WWW_DOMAIN) {
      const newUrl = `${currentProtocol}//${this.MAIN_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(newUrl);
      return;
    }
    
    // Se estiver em starvibe.space, mantém
    if (currentHost === this.MAIN_DOMAIN) {
      return;
    }
    
    // Para subdomínios, verifica se não é www
    if (currentHost.startsWith('www.')) {
      const subdomain = currentHost.replace('www.', '');
      const newUrl = `${currentProtocol}//${subdomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(newUrl);
    }
  }

  /**
   * Verifica se o domínio atual é válido
   */
  static isValidDomain(hostname: string): boolean {
    // Domínios válidos
    const validDomains = [
      'starvibe.space',
      'localhost',
      '127.0.0.1',
      'uproomvp.vercel.app'
    ];
    
    // Verifica se é um domínio válido
    if (validDomains.includes(hostname)) {
      return true;
    }
    
    // Verifica se é um subdomínio válido (não www)
    if (hostname.endsWith('.starvibe.space') && !hostname.startsWith('www.')) {
      return true;
    }
    
    // Verifica se é localhost com porta
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return true;
    }
    
    return false;
  }

  /**
   * Obtém o domínio correto para redirecionamento
   */
  static getCorrectDomain(hostname: string): string {
    // Se for www.starvibe.space, redireciona para starvibe.space
    if (hostname === this.WWW_DOMAIN) {
      return this.MAIN_DOMAIN;
    }
    
    // Se for www.qualquer-coisa.starvibe.space, remove o www
    if (hostname.startsWith('www.') && hostname.endsWith('.starvibe.space')) {
      return hostname.replace('www.', '');
    }
    
    // Para outros casos, mantém o domínio atual
    return hostname;
  }

  /**
   * Inicializa a correção de redirecionamentos
   */
  static init(): void {
    // Verifica se está em um ambiente de produção
    if (typeof window === 'undefined') return;
    
    const currentHost = window.location.hostname;
    
    // Se não for um domínio válido, tenta corrigir
    if (!this.isValidDomain(currentHost)) {
      const correctDomain = this.getCorrectDomain(currentHost);
      if (correctDomain !== currentHost) {
        const newUrl = `${window.location.protocol}//${correctDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl);
        return;
      }
    }
    
    // Verifica se há redirecionamento infinito
    this.checkAndFixRedirects();
  }
}

// Auto-inicializa quando o módulo é carregado
if (typeof window !== 'undefined') {
  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      RedirectFix.init();
    });
  } else {
    RedirectFix.init();
  }
}
