
// Custom renderer for links and headings 
const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

    if (depth == 1) {
      document.title = `_ocean: ${text}`;
    }

    // Get the current document path from the hash (without anchors)
    const currentHash = window.location.hash;
    const documentPath = currentHash.split('#')[1] || ''; // Remove first # and any anchors
    
    // Create anchor href with document path and anchor
    const anchorHref = documentPath ? `#${documentPath}#${escapedText}` : `#${escapedText}`;

    return `
            <h${depth}>
              <a name="${escapedText}" class="anchor" href="${anchorHref}">
              ${text}
              </a>
            </h${depth}>`;
  },
  link({tokens, href}) {
    const text = this.parser.parseInline(tokens);
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
    if (href.startsWith('http') || href.startsWith('www')) {
      return `<a name="${escapedText}" href="${href}">${text}</a>`;
    }
    return `<a name="${escapedText}" href="#${href}">${text}</a>`;
  },
  image({href, title, text}) {

    title = title || text;
    const hash = window.location.hash.slice(1, window.location.hash.length);
    var base = hash.split('/');
    base = base.slice(0, base.length-1).join('/');
    href = `${base}/${href}`;
    var res = `<figure><img src="${href}" alt="${title}"/><figcaption>${text}</figcaption></figure>`;
    return res;
  }

};

// Initialize marked once with all configuration
marked.setOptions({
  breaks: true,
  gfm: true
});

// Configure highlighting plugin
const highlightPlugin = markedHighlight.markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    try {
      return hljs.highlight(code, { language }).value;
    } catch (__) {
      return code;
    }
  }
});

// Use plugins
marked.use(highlightPlugin);
marked.use({ renderer });

function renderEl(elid, content){
  document.getElementById(elid).innerHTML = marked.parse(content);
}

function renderFi(target){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
       renderEl("content", xhttp.responseText);
    }
  };
  xhttp.open("GET", target, true);
  xhttp.send();
}

// intercept all the clicks!
function click_callback(e) {
  var e = window.e || e;

  if (e.target.tagName !== 'A')
      return;

  var uri_components = e.target.href.split("#");
  if (uri_components[1] == "/"){
    renderFi("/README.md");
    location.hash = "";
  } else {
    if (e.target.href.startsWith('http') || e.target.href.startsWith('www')) {
      return;
    }
    renderFi(uri_components[1]);
    location.hash = e.target.hash;
  }
  e.preventDefault(); // Cancel the native event
  e.stopPropagation();// Don't bubble/capture the event any further
  return;
}
function hash_changed(){
  if(!window.location.hash){
    renderFi("/README.md");
  } else {
    var uri_components = window.location.href.split("#")
    renderFi(uri_components[1]);
  }
}

window.addEventListener("hashchange", (event) => {hash_changed();});
window.addEventListener("load", (event) => {hash_changed();});

if (document.addEventListener) {
    document.addEventListener('click', click_callback, false);
} else {
    document.attachEvent('onclick', click_callback);
}