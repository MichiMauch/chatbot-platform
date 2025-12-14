(function() {
  // Get configuration from script tag
  const script = document.currentScript;
  const chatId = script.getAttribute('data-chat-id');
  const position = script.getAttribute('data-position') || 'bottom-right';
  const primaryColor = script.getAttribute('data-color') || '#3b82f6';
  const bubbleText = script.getAttribute('data-bubble-text') || '';
  const logoPath = script.getAttribute('data-logo') || '';

  // Get base URL from script src
  const baseUrl = script.src.replace('/widget.js', '');

  if (!chatId) {
    console.error('ChatLabs Widget: data-chat-id is required');
    return;
  }

  // Check if bubble was already dismissed in this session
  const bubbleDismissedKey = 'chatlabs-bubble-dismissed-' + chatId;
  let bubbleDismissed = sessionStorage.getItem(bubbleDismissedKey) === 'true';

  // Create styles
  const styles = document.createElement('style');
  styles.textContent = `
    #chatlabs-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #chatlabs-widget-bubble {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${logoPath ? 'white' : primaryColor};
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      border: none;
      outline: none;
      overflow: hidden;
    }

    #chatlabs-widget-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    #chatlabs-widget-bubble svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #chatlabs-widget-bubble.open {
      background: ${primaryColor};
    }

    #chatlabs-lottie-container {
      width: 44px;
      height: 44px;
    }

    #chatlabs-widget-popup {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 100px;' : 'top: 100px;'}
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 140px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 99998;
      display: none;
      overflow: hidden;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    #chatlabs-widget-popup.open {
      display: block;
      animation: chatlabs-slide-in 0.3s ease;
    }

    @keyframes chatlabs-slide-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #chatlabs-widget-popup iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    #chatlabs-speech-bubble {
      position: fixed;
      ${position.includes('right') ? 'right: 100px;' : 'left: 100px;'}
      ${position.includes('bottom') ? 'bottom: 28px;' : 'top: 28px;'}
      max-width: 280px;
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.1);
      z-index: 99997;
      animation: chatlabs-fade-in 0.3s ease;
    }

    #chatlabs-speech-bubble p {
      margin: 0;
      font-size: 14px;
      color: #374151;
      line-height: 1.4;
      padding-right: 16px;
    }

    #chatlabs-speech-bubble-close {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #f3f4f6;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #chatlabs-speech-bubble-close:hover {
      background: #e5e7eb;
    }

    #chatlabs-speech-bubble-close svg {
      width: 12px;
      height: 12px;
      fill: #6b7280;
    }

    #chatlabs-speech-bubble-pointer {
      position: absolute;
      top: 50%;
      ${position.includes('right') ? 'right: -8px;' : 'left: -8px;'}
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      ${position.includes('right') ? 'border-left: 8px solid white;' : 'border-right: 8px solid white;'}
    }

    @keyframes chatlabs-fade-in {
      from {
        opacity: 0;
        transform: translateX(${position.includes('right') ? '10px' : '-10px'});
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 480px) {
      #chatlabs-widget-popup {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        right: 10px !important;
        left: 10px !important;
        bottom: 80px !important;
        max-height: none;
        border-radius: 12px;
      }

      #chatlabs-widget-bubble {
        width: 56px;
        height: 56px;
        right: 16px !important;
        bottom: 16px !important;
      }

      #chatlabs-speech-bubble {
        right: 80px !important;
        max-width: calc(100vw - 120px);
      }
    }
  `;
  document.head.appendChild(styles);

  // Create widget container
  const container = document.createElement('div');
  container.id = 'chatlabs-widget-container';

  // Chat icon SVG
  const chatIcon = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';

  // Close icon SVG
  const closeIcon = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // Small close icon for speech bubble
  const smallCloseIcon = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // Build speech bubble HTML if text is provided and not dismissed
  const speechBubbleHtml = (bubbleText && !bubbleDismissed) ? `
    <div id="chatlabs-speech-bubble">
      <button id="chatlabs-speech-bubble-close" aria-label="Schliessen">
        ${smallCloseIcon}
      </button>
      <p>${bubbleText}</p>
      <div id="chatlabs-speech-bubble-pointer"></div>
    </div>
  ` : '';

  // Bubble content: Lottie container if logo, otherwise chat icon
  const bubbleContent = logoPath
    ? '<div id="chatlabs-lottie-container"></div>'
    : chatIcon;

  container.innerHTML = `
    ${speechBubbleHtml}
    <button id="chatlabs-widget-bubble" aria-label="Chat öffnen">
      ${bubbleContent}
    </button>
    <div id="chatlabs-widget-popup">
      <iframe src="${baseUrl}/embed/${chatId}?widget=true" title="Chat"></iframe>
    </div>
  `;

  document.body.appendChild(container);

  // Initialize widget
  const bubble = document.getElementById('chatlabs-widget-bubble');
  const popup = document.getElementById('chatlabs-widget-popup');
  const speechBubble = document.getElementById('chatlabs-speech-bubble');
  const speechBubbleClose = document.getElementById('chatlabs-speech-bubble-close');
  const lottieContainer = document.getElementById('chatlabs-lottie-container');
  let isOpen = false;
  let lottieAnimation = null;

  // Function to dismiss speech bubble
  function dismissSpeechBubble() {
    if (speechBubble) {
      speechBubble.remove();
      sessionStorage.setItem(bubbleDismissedKey, 'true');
    }
  }

  // Speech bubble close button
  if (speechBubbleClose) {
    speechBubbleClose.addEventListener('click', function(e) {
      e.stopPropagation();
      dismissSpeechBubble();
    });
  }

  // Toggle function
  function toggleWidget() {
    isOpen = !isOpen;

    if (isOpen) {
      popup.classList.add('open');
      bubble.classList.add('open');
      bubble.innerHTML = closeIcon;
      bubble.setAttribute('aria-label', 'Chat schliessen');
      dismissSpeechBubble();
      if (lottieAnimation) {
        lottieAnimation.stop();
      }
    } else {
      popup.classList.remove('open');
      bubble.classList.remove('open');
      if (logoPath && lottieContainer) {
        bubble.innerHTML = '<div id="chatlabs-lottie-container"></div>';
        initLottie();
      } else {
        bubble.innerHTML = chatIcon;
      }
      bubble.setAttribute('aria-label', 'Chat öffnen');
    }
  }

  bubble.addEventListener('click', toggleWidget);

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleWidget();
    }
  });

  // Initialize Lottie if logo path is provided
  function initLottie() {
    const container = document.getElementById('chatlabs-lottie-container');
    if (!container || !window.lottie) return;

    lottieAnimation = window.lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: baseUrl + logoPath
    });
  }

  // Load Lottie library if logo is provided
  if (logoPath) {
    const lottieScript = document.createElement('script');
    lottieScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    lottieScript.onload = initLottie;
    document.head.appendChild(lottieScript);
  }
})();
