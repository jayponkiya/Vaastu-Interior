/* ==========================================================================
   Vastu Interior — forms.js
   [data-quote-form]: short quote form for a static site (no backend).
   On submit it validates the fields, then opens WhatsApp to the studio
   (+91 63590 31530) with the details pre-written. Nothing is stored or
   sent anywhere else. A mailto link with the same text is offered as a
   fallback. Replace with a form handler (e.g. Formspree) if one is added
   in the contact phase.
   ========================================================================== */
(() => {
  'use strict';

  const WHATSAPP = '916359031530';
  const EMAIL = 'vastuinterior10@gmail.com';

  function showError(field, message) {
    const wrap = field.closest('.field');
    if (!wrap) return;
    let err = wrap.querySelector('.field__error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field__error';
      err.id = `${field.id}-error`;
      wrap.append(err);
    }
    err.textContent = message;
    wrap.classList.toggle('is-invalid', Boolean(message));
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    const described = (field.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== err.id);
    if (message) described.push(err.id);
    if (described.length) field.setAttribute('aria-describedby', described.join(' '));
    else field.removeAttribute('aria-describedby');
  }

  function messageFor(field) {
    if (field.validity.valueMissing) return `Please enter your ${field.dataset.label || 'details'}.`;
    if (field.validity.patternMismatch) return field.dataset.patternMessage || 'Please check this field.';
    if (field.validity.typeMismatch) return 'Please check the format.';
    return '';
  }

  function initQuoteForm(form) {
    const status = form.querySelector('[data-form-status]');
    const fields = [...form.querySelectorAll('input, textarea, select')].filter((f) => f.type !== 'hidden');
    form.noValidate = true;

    fields.forEach((field) => {
      field.addEventListener('blur', () => { if (field.value) showError(field, messageFor(field)); });
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') showError(field, messageFor(field)); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      fields.forEach((field) => {
        const msg = messageFor(field);
        showError(field, msg);
        if (msg && !firstBad) firstBad = field;
      });
      if (firstBad) {
        firstBad.focus();
        if (status) { status.className = 'form-status form-status--error'; status.textContent = 'Please fill in the highlighted fields.'; status.hidden = false; }
        return;
      }

      const data = new FormData(form);
      const lines = [
        `Hi Vastu Interior, I'd like a quote${data.get('service') ? ` for ${data.get('service')}` : ''}.`,
        `Name: ${data.get('name')}`,
        `Phone: ${data.get('phone')}`,
      ];
      if (data.get('location')) lines.push(`Location: ${data.get('location')}`);
      if (data.get('message')) lines.push(`About the project: ${data.get('message')}`);
      const text = lines.join('\n');

      const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
      const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`Quote request${data.get('service') ? `: ${data.get('service')}` : ''}`)}&body=${encodeURIComponent(text)}`;
      window.open(wa, '_blank', 'noopener');

      if (status) {
        status.className = 'form-status form-status--success';
        status.innerHTML = '';
        status.append('WhatsApp should now be open with your details. Press send there to reach us. ');
        const a = document.createElement('a');
        a.href = mail;
        a.textContent = 'Prefer email? Send it by email instead.';
        status.append(a);
        status.hidden = false;
        status.focus();
      }
    });
  }

  document.querySelectorAll('form[data-quote-form]').forEach(initQuoteForm);
})();
