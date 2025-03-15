document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Mermaid in extra.js');
  
  // Initialize Mermaid with configuration
  mermaid.initialize({
    startOnLoad: false, // We'll handle initialization manually
    theme: 'default',
    securityLevel: 'loose',
    htmlLabels: true,
    flowchart: {
      curve: 'basis',
      useMaxWidth: true
    },
    themeVariables: {
      primaryColor: '#f4f4f4',
      primaryTextColor: '#333',
      primaryBorderColor: '#ccc',
      lineColor: '#666',
      secondaryColor: '#e8e8e8',
      tertiaryColor: '#fff'
    }
  });
  
  // Function to process Mermaid diagrams
  function processMermaidDiagrams() {
    console.log('Processing Mermaid diagrams');
    
    // Try multiple selectors to find Mermaid code blocks
    let mermaidBlocks = document.querySelectorAll('pre code.language-mermaid');
    console.log('Found ' + mermaidBlocks.length + ' Mermaid blocks with language-mermaid class');
    
    // If none found, try other possible selectors
    if (mermaidBlocks.length === 0) {
      mermaidBlocks = document.querySelectorAll('pre code.mermaid');
      console.log('Found ' + mermaidBlocks.length + ' Mermaid blocks with mermaid class');
    }
    
    // If still none found, try to find div.mermaid that might already exist
    let mermaidDivs = document.querySelectorAll('div.mermaid');
    console.log('Found ' + mermaidDivs.length + ' existing Mermaid divs');
    
    // Process code blocks if found
    if (mermaidBlocks.length > 0) {
      // Process each mermaid block
      mermaidBlocks.forEach(function(mermaidBlock, index) {
        console.log('Processing Mermaid block', index);
        var pre = mermaidBlock.parentElement;
        var content = mermaidBlock.textContent.trim();
        
        console.log('Mermaid content:', content.substring(0, 50) + '...');
        
        // Create a new div for mermaid
        var div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = content;
        div.setAttribute('data-processed', 'false');
        
        // Replace the pre element with the new div
        if (pre && pre.parentElement) {
          pre.parentElement.replaceChild(div, pre);
          console.log('Replaced pre with mermaid div');
        }
      });
    }
    
    // Re-run mermaid on all divs (both newly created and existing)
    try {
      console.log('Reinitializing Mermaid');
      mermaid.init(undefined, '.mermaid');
    } catch (e) {
      console.error('Mermaid initialization error:', e);
    }
  }
  
  // Process diagrams after a short delay to ensure DOM is ready
  setTimeout(processMermaidDiagrams, 1000);
  
  // Also try again after page is fully loaded
  window.addEventListener('load', function() {
    setTimeout(processMermaidDiagrams, 1000);
  });
}); 