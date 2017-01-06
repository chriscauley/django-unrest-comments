// https://jsfiddle.net/warpech/8dyx615f/
(function loadURLShim() {
  var airbrake = window.airbrake || {log: function(e) { console.error(e) } };
  try {
    airbrake.log("trying origin");
    new URL(window.location.href,window.location.origin);
    airbrake.log("trying undefined");
    new URL(window.location.href,undefined);
    return;
  } catch (e) {
    airbrake.log("Reason for using url shim:");
    airbrake.log(e);
  }
  window.URL = function shimURL(url, base) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.write('<base href="' + base + '"><a href="' + url + '"></a>');
    var a = iframe.contentWindow.document.querySelector('a');
    document.body.removeChild(iframe);
    return a;
  }
})();

var uR = (function() {
  var uR = window.uR || {};

  uR.serialize = function serialize(form) {
    var field, s = [];
    if (typeof form != 'object' && form.nodeName != "FORM") { return }
    var len = form.elements.length;
    for (i=0; i<len; i++) {
      field = form.elements[i];
      if (!field.name || field.disabled || field.type == 'file' || field.type == 'reset' ||
          field.type == 'submit' || field.type == 'button') { continue }
      if (field.type == 'select-multiple') {
        for (j=form.elements[i].options.length-1; j>=0; j--) {
          if(field.options[j].selected)
            s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[j].value);
        }
      } else if ((field.type != 'checkbox' && field.type != 'radio') || field.checked) {
        s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value);
      }
    }
    return s.join('&').replace(/%20/g, '+');
  }
  uR.getQueryParameter = function getQueryParameter(name,search) {
    var regexp = new RegExp("[\?&](?:"   +name+")=([^&]+)");
    var _sd = (search || window.location.search).match(regexp);
    if (_sd) { return _sd[1]; }
  }

  uR.cookie = {
    set: function (name,value,days) {
      var expires = "";
      if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        expires = "; expires="+date.toGMTString();
      }
      document.cookie = name+"="+value+expires+"; path=/";
    },
    get: function(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }
      return null;
    },
    delete: function (name) { this.set(name,"",-1); }
  }

  function isEmpty(obj) {
    for (key in obj) { return false; }
    return true;
  }

  uR.ajax = function ajax(opts) {
    // create default options
    // note: !!form is always true, opts.form can be undefined (falsey)
    // but form.some_property will always be false if there is no form!
    var form = opts.form || {};
    var method = (opts.method || form.method || "GET").toUpperCase();
    var data = opts.data;
    var target = opts.target || opts.form;  // default to body?
    var url = opts.url || form.action || '.';
    var that = opts.that;
    var loading_attribute = opts.loading_attribute || (that && that.loading_attribute) || uR.config.loading_attribute;
    var success_attribute = opts.success_attribute || "";
    var success_reset = opts.success_reset || false;
    var success = (opts.success || function(data,request) {}).bind(that);
    var error = (opts.error || function(data,request) {}).bind(that);
    var filenames = opts.filenames || {};
    if (that) {
      that.messages = opts.messages || [];
      that._ajax_busy = true;
      that.form_error = undefined;
      if (!target && that.target) { console.warn("Use of that.target is depracated in favor of that.ajax_target") }
      target = target || that.target || that.ajax_target;
    }

    // mark as loading
    if (target) {
      target.removeAttribute("data-success");
      target.setAttribute("data-loading",loading_attribute);
    }

    // create form_data from data or form
    if (!data && opts.form) {
      data = {};
      uR.forEach(opts.form.elements,function(element) {
        if (element.type == "file") {
          data[element.name] = element.files[0];
          filenames[element.name] = element.files[0].name;
        } else {
          data[element.name] = element.value;
        }
      });
    }
    // POST uses FormData, GET uses query string
    var form_data = new FormData(opts.form);
    if (method=="POST" && !opts.form) {
      for (var key in data) {
        filenames[key]?form_data.append(key,data[key],filenames[key]):form_data.append(key,data[key]);
      };
    }
    if (method != "POST") {
      url += (url.indexOf("?") == -1)?"?":"&";
      for (key in data) { url += key + "=" + data[key] + "&" }
    }

    // create and send XHR
    var request = new XMLHttpRequest();
    request.open(method, url , true);
    request.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    if ("POSTDELETE".indexOf(method) != -1 && document.querySelector("[name=csrfmiddlewaretoken]")) {
      request.setRequestHeader("X-CSRFToken",document.querySelector("[name=csrfmiddlewaretoken]").value);
    }
    request.onload = function(){
      try { var data = JSON.parse(request.response); }
      catch (e) {
          var data = {};
      }
      if (target) { target.removeAttribute('data-loading'); }
      var errors = data.errors || {};
      if (data.error) { errors = { non_field_error: data.error }; }
      var non_field_error = errors.non_field_error;
      if (isEmpty(errors) && request.status != 200) {
        non_field_error = opts.default_error || "An unknown error has occurred";
      }
      if (that && that.fields) {
        uR.forEach(that.fields,function(field,i) {
          field.error = errors[field.name];
        });
      }
      if (non_field_error) {
        // if there's no form and no error function in opts, alert as a fallback
        if (that) { that.non_field_error = non_field_error; } else if (!opts.error) { uR.alert(non_field_error); }
      }

      var complete = (request.status == 200 && isEmpty(errors));
      (complete?success:error)(data,request);
      if (target && complete && !data.messages) { target.setAttribute("data-success",success_attribute) }
      if (that) {
        that._ajax_busy = false;
        that.messages = data.messages || [];
        that.update();
      }
      if (data.ur_route_to) { uR.route(data.ur_route_to); }
    };
    request.send(form_data);
  }

  uR.debounce = function debounce(func, wait, immediate) {
    var timeout, wait = wait || 200;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
      return true;
    };
  }

  uR.dedribble = function dedribble(func, wait, end_bounce) {
    var timeout, wait = wait || 200, end_bounce = (end_bounce !== undefined) && true ;
    var last = new Date();
    return function() {
      var context = this, args = arguments;
      if (end_bounce) {
        var later = function() {
          timeout = null;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      }
      if (new Date() - last > wait) { func.apply(context, args); last = new Date(); }
    };
  };

  // this function may someday be replaced with rambdas map
  uR.forEach = function forEach(array,func,context) {
    if (context) { func = func.bind(context) }
    for (var i=0;i<array.length;i++) { func(array[i],i,array); }
  }

  // this function may someday be replaced with rambdas merge
  uR.extend = function(a,b) {
    for (var i in b) {
      if (b.hasOwnProperty(i)) { a[i] = b[i]; }
    }
  }

  // uR.ready is a function for handling window.onload
  uR._ready = uR._ready || [];
  uR.ready = function(func) { uR._ready.push(func); };
  window.onload = function() {
    for (var i=0;i<uR._ready.length;i++) { uR._ready[i]() }
    uR.ready = function(func) { func(); }
    uR.route && uR.route(window.location.href);
    // #! dummy route function. This is so everything can use uR.route without router.js
    uR.route = uR.route || function route(path,data) { window.location = path }
  }

  uR.getSchema = function getSchema(url,callback) {
    uR.ajax({
      url: url,
      success: function(data) {
        uR.schema[url] = data.schema;
        uR.schema.__initial[url] = data.initial;
        callback && callback();
      }
    });
  };

  uR.onBlur = uR.onBlur || function() {};
  uR.config = uR.config || {};
  uR.config.doPostAuth = function() {}
  uR.config.form = {};
  uR.config[404] = 'four-oh-four';
  uR.config.form.field_class = "input-field";
  uR.config.loading_attribute = uR.config.loading_attribute || 'spinner';
  uR.config.loading_attribute = 'spinner';
  uR.config.success_attribute = 'spinner';
  uR.config.select_class = 'browser-default';
  uR.config.tag_templates = [];
  uR.config.text_validators = {};
  uR.config.mount_to = "#content";
  uR.config.mount_alerts_to = "#alert-div";
  uR.config.btn_primary = "btn blue";
  uR.config.btn_success = "btn green";
  uR.config.btn_cancel = "btn red";
  uR.config.cancel_text = "Cancel";
  uR.config.success_text = "Submit";
  uR.config.alert_success = "alert alert-success card card-content"; // bootstrap
  uR._var = {};
  uR.alert = function(s) { alert(s); }; // placeholder for future alert function
  uR.schema = {fields: {},__initial: {}};
  uR.urls = {};
  uR.slugify = function(s) {
    return s.toLowerCase().replace(/(^[\s-]+|[\s-]+$)/g,"").replace(/[^\d\w -]+/g,"").replace(/[\s-]+/g,"-");
  };
  uR.theme = {
    modal: {
      outer: "card",
      header: "card-title",
      content: "card-content",
      footer: "card-action",
    },
    default: {
      outer: "card",
      header: "card-title",
      content: "card-content",
      footer: "card-action",
    },
    error_class: "card red white-text",
  }
  return uR;
})();

(function() {
  uR.static = function(s) {
    return uR.config.STATIC_URL+s;
  }
  uR.config.STATIC_URL = "/static/";
})();

uR = window.uR || {};
uR.storage = (function() {
  // basic functions
  function get(key) {
    var value;
    if (localStorage.hasOwnProperty(key)) {
      try { value = JSON.parse(localStorage.getItem(key)); }
      catch(e) { }
    } else if (uR.storage.defaults.hasOwnProperty(key)) {
      value = uR.storage.defaults[key];
    }
    return value
  }
  function set(key,value) {
    if (! value) { localStorage.removeItem(key); return; }
    localStorage.setItem(key,JSON.stringify(value))
  }

  // timebomb remote data store
  var __expiry = '__expiry'; // Key used for expiration storage
  function isExpired(key) {
    var expire_ms = get(__expiry+key);
    if (!expire_ms) { setExpire(key); }
    return expire_ms && expire_ms < new Date().valueOf();
  }
  function setExpire(key,epoch_ms) {
    if (!epoch_ms) { epoch_ms = uR.storage.default_expire_ms + new Date().valueOf() }
    set(__expiry+key,epoch_ms);
  }
  function remote(url,callback) {
    var stored = get(url);
    if (stored && !isExpired(stored)) { callback(stored); return }
    uR.ajax({
      url: url,
      success: function(data) {
        set(url,data);
        setExpire(url);
        callback(data);
      }
    });
  }

  return {
    get: get,
    set: set,
    lookups: {}, // functions to look up missing/expired values
    defaults: {}, // table with default values
    remote: remote,
    default_expire_ms: 60*1000, // assume data expires in 1 minutes
  }
})();

(function() {
  uR.mountElement = function mountElement(name,options) {
    options = options || {};
    var target = document.querySelector(options.mount_to || uR.config.mount_to);
    var children = target.childNodes;
    var i = target.childNodes.length;
    while (i--) { target.removeChild(children[i]); }
    var element = document.createElement(name);
    if (options.innerHTML) { element.innerHTML = options.innerHTML; }
    target.appendChild(element);
    riot.mount(name,options);
  }

  uR.alertElement = function alertElement(name,options) {
    options = options || {};
    if (!options.hasOwnProperty("ur_modal")) { options.ur_modal = true; }
    options.mount_to = uR.config.mount_alerts_to;
    uR.mountElement(name,options);
  }

  function pushState(path) {
    if (window.location.pathname == path) { return; }
    // #! TODO the empty string here is the page title. Need some sort of lookup table
    history.pushState({path:path},"" || document.title,path);
  } 

  uR.pushState = uR.debounce(pushState,100)

  uR.route = function route(href,data) {
    var new_url = new URL(href,href.match("://")?undefined:window.location.origin);
    var old_url = new URL(window.location.href);
    var pathname = new_url.pathname;

    uR.forEach(uR._on_routes,function(f) {f(pathname,data)})
    data = data || {};
    data.location = new_url;
    for (key in uR._routes) {
      data.matches = pathname.match(new RegExp(key));

      if (data.matches) {
        uR.STALE_STATE = true;
        uR._routes[key](pathname,data);
        uR.pushState(href);
        return;
      }
    }
    // uR.config.do404();

    // #! TODO The following is used for django pages + back button
    // We're not in the single page app, reload if necessary
    if (uR.STALE_STATE) {
      window.location = href;
    }
    uR.STALE_STATE = true;
  }

  function onClick(e) {
    // Borrowed heavily from riot
    // this will stop links from changing the page so I can use href instead of onclick
    if (
      e.which != 1 // not left click
        || e.metaKey || e.ctrlKey || e.shiftKey // or meta keys
        || e.defaultPrevented // or default prevented
    ) return

    var el = e.target, loc = (window.history.location || window.location);
    while (el && el.nodeName != 'A') el = el.parentNode

    if (
      !el || el.nodeName != 'A' // not A tag
        || el.hasAttribute('download') // has download attr
        || !el.hasAttribute('href') // has no href attr
        || el.target && el.target != '_self' // another window or frame
        || el.href.indexOf(loc.href.match(/^.+?\/\/+[^\/]+/)[0]) == -1 // cross origin
    ) return

    /*if (el.href != loc.href && (
      el.href.split('#')[0] == loc.href.split('#')[0] // internal jump
        || base[0] != '#' && getPathFromRoot(el.href).indexOf(base) !== 0 // outside of base
        || base[0] == '#' && el.href.split(base)[0] != loc.href.split(base)[0] // outside of #base
        || !go(getPathFromBase(el.href), el.title || document.title) // route not found
    )) return*/

    e.preventDefault();
    uR.route(el.href);
  }

  uR.addRoutes = function(routes) { uR.extend(uR._routes,routes); }
  uR.startRouter = function() { document.addEventListener('click', onClick); };

  uR.config.do404 = function() { uR.mountElement("four-oh-four"); }
  uR._routes = uR._routes || {};
  uR._on_routes = [];
  uR.onRoute = function(f) { uR._on_routes.push(f) }
})();

(function() {
  uR.auth = uR.auth || {};
  uR.auth.loginRequired = function loginRequired(func,data) {
    if (typeof func == "string") {
      var tagname = func;
      func = function(path,data) {
        uR.mountElement(tagname,data)
      }
    }
    data = data || {};
    function wrapped() {
      var args = arguments;
      uR.auth.ready(function() {
        function success(data) {
          if (data) { uR.auth.setUser(data.user); }
          func.apply(this,args);
        }
        if (!uR.auth.user || data.force) {
          uR.AUTH_SUCCESS = success;
          data.slug = "register";
          uR.alertElement("auth-modal",data);
        }
        else { success(); }
      });
    }
    wrapped.login_required = true;
    return wrapped;
  }
  uR.auth.setUser = function setUser(user) {
    uR.storage.set('auth.user',user || null); // JSON.stringify hates undefined
    uR.auth.user = user;
    uR.auth.postAuth();
    riot.update(uR.auth.tag_names);
  }
  uR.auth.postAuth = function() {}
  uR.auth._getLinks = function() {
    return [
      {url: "/account/settings/", icon: "gear", text: "Account Settings"},
      {url: "/auth/logout/", icon: "sign-out", text: "Log Out"},
    ];
  }
  uR.auth.getLinks = uR.auth._getLinks;

  uR.schema.auth = {
    login: [
      { name: 'username', label: 'Username or Email' },
      { name: 'password', type: 'password' },
    ],
    register: [
      { name: 'email', label: 'Email Address', type: "email" },
      { name: 'password', type: 'password' },
    ],
    'password-reset': [ { name: 'email', label: 'Email Address', type: "email" }, ]
  };
  uR.urls.auth = {
    login: "/auth/login/"
  }
  uR.urls.api = uR.urls.api || {};
  uR.urls.api.login = "/api/login/";
  uR.urls.api.register = "/api/register/";
  uR.urls.api['password-reset'] = "/api/password-reset/";
  uR.auth.tag_names = 'auth-dropdown,auth-modal';
  uR.addRoutes({
    "/auth/(login|register|forgot-password)/": function(path,data) { uR.alertElement("auth-modal",data); },
    "/auth/logout/": function(path,data) {
      uR.auth.setUser(null);
      window.location = "/accounts/logout/";
    },
  });

  uR.auth.user = uR.storage.get("auth.user");
  uR.ready(function() {
    riot.mount(uR.auth.tag_names);
    uR.auth.reset();
  });
  var _ready = [];
  uR.auth.ready = function(f) { _ready.push(f) };
  uR.auth.reset = function(callback) {
    callback = callback || function() {}
    uR.ajax({
      url: "/user.json",
      success: function(data) {
        if (data.user != uR.auth.user) { uR.auth.setUser(data.user); }
        callback();
        uR.auth.ready = function(f) { f(); }
        uR.forEach(_ready,uR.auth.ready);
      },
    });
  }
})();

riot.tag2('auth-modal', '<dialog class="{theme.outer}" open> <div class="{theme.header}"> <h3>{title}</h3> </div> <div class="{theme.content}"> <div class="social" if="{slug != \'fogot_password\' && uR.auth.social_logins.length}"> <a class="btn btn-block btn-{icon}" href="/login/{slug}?next={next}" each="{uR.auth.social_logins}"> <i class="fa fa-{icon}"></i> Connect with {name}</a> <center>- or {slug} using your email address -</center> </div> <ur-form schema="{schema}" action="{url}" method="POST" ajax_success="{opts.success}"></ur-form> <center if="{slug == \'login\'}"> <a href="/auth/register/?next={next}">Create an Account</a><br> <a href="/auth/forgot-password/?next={next}">Forgot Password?</a> </center> <center if="{slug == \'register\'}"> Already have an account? <a href="/auth/login/?next={next}">Login</a> to coninue </center> <center if="{slug == \'password_reset\'}"> Did you suddenly remember it? <a href="/auth/login/?next={next}">Login</a> </center> </div> </dialog>', '', '', function(opts) {
  var self = this;
  this.ajax_success = function(data) {
    uR.auth.setUser(data.user);
    (uR.AUTH_SUCCESS || function() {
      var path = self.next || "/";
      if (window.location.pathname.startsWith("/auth/")) { path == "/"; }
      uR.route(path);
    })();
    self.unmount();
    uR.AUTH_SUCCESS = undefined;
  }.bind(this)
  this.on("mount",function() {
    if (uR.auth.user) { this.ajax_success({ user: uR.auth.user }); }
    this.next = uR.getQueryParameter("next");
    this.slug = this.opts.slug || this.opts.matches[1];
    this.url = uR.urls.api[this.slug];
    this.schema = uR.schema.auth[this.slug];
    this.title = {
      login: "Please Login to Continue",
      register: "Create an Account",
      'forgot-password': "Request Password Reset"
    }[this.slug];
    this.update();
  });
  this.on("update", function() {

    if (uR.auth.user) { self.ajax_success({user: uR.auth.user}) }
  });
  this.close = function(e) {
    if (window.location.pathname.startsWith("/auth/")) { window.location = "/" }
    this.unmount();
  }.bind(this)
});

riot.tag2('auth-dropdown', '<li if="{!uR.auth.user}"> <a href="{url}?next={window.location.pathname}"><i class="{icon}"></i> {text}</a> </li> <li if="{uR.auth.user}"> <a onclick="{toggle}">{uR.auth.user.username}</a> <ul class="dropdown-content"> <li each="{links}"><a href="{url}"><i class="fa fa-{icon}"></i> {text}</a></li> </ul> </li>', '', '', function(opts) {

  this.on("mount",function() {
    if (uR.auth.user) { this.links = uR.auth.getLinks() }
    else {
      this.url = uR.auth.login_url || "/auth/login/";
      this.icon = uR.auth.login_icon || "fa fa-user";
      this.text = uR.auth.login_text || "Login or Register";
    }
    this.update();
  });
});

uR.config.tag_templates.push("checkbox-input");

riot.tag2('checkbox-input', '<div each="{choices}" class="choice"> <input type="checkbox" id="{id}" riot-value="{value}" name="{name}" onchange="{update}"> <label for="{id}">{label}</label> </div>', '', '', function(opts) {

  var self = this;
  this.on("mount",function() {
    var _choices = uR.form.parseChoices(this.parent.choices);
    this.choices = _choices.map(function(choice_tuple,index) {
      return {
        name: self.parent._name,
        label: choice_tuple[1],
        id: "checkbox_"+self.parent._name+"_"+index,
        value: uR.slugify(choice_tuple[0]),
      }
    });
    this.update();
    if (this.parent.initial_value) {
      var initial = this.parent.initial_value;
      if (typeof initial == "string") { initial = initial.split(",") }
      uR.forEach(initial,function(slug) {
        var cb = self.root.querySelector("[value="+slug+"]");
        if (cb) { cb.checked = true }
      })
      this.update();
    }
    this._is_mounted = true;
  });
  this.on("update",function() {
    var out = [];
    uR.forEach(this.root.querySelectorAll("[type=checkbox]"),function(c) {
      c.checked && out.push(c.value);
    });
    this.setValue(out.join(","));
  });
});

(function() { 
  var DialogMixin = {
    init: function() {
      if (this.opts.ur_modal){
        this.theme = this.opts.theme || uR.theme.modal;
        var e = document.createElement('div');
        this.cancel = this.cancel || function() { this.unmount() };
        e.addEventListener("click",this.cancel.bind(this));
        e.setAttribute("ur-mask",true);
        if (this.root.childNodes.length) {
          this.root.insertBefore(e,this.root.childNodes[0])
        } else {
          this.root.appendChild(e);
        }
      } else {
        this.theme = this.opts.theme || uR.theme.default;
      }
    }
  }

  riot.mixin(DialogMixin);

  uR.alert = function(text,data) {
    data = data || {};
    data.close_text = data.close_text || "Close";
    data.innerHTML = "<center style='margin-bottom: 1em;'>"+text+"</center>";
    uR.alertElement("ur-modal",data);
  } 
  uR.confirm = function(text,data) {
    if (typeof data == 'function') { data = { success: data } }
    data = data || {};
    data.buttons = data.buttons || [];
    data.close_text = data.close_text || "No";
    data.buttons.push({
      onclick: data.success,
      className: uR.config.btn_success,
      text: data.success_text || "Yes"
    });
    data.innerHTML = "<center style='margin-bottom: 1em;'>"+text+"</center>";
    uR.alert(text,data);
  }
})();

riot.tag2('ur-modal', '<div class="{theme.outer}"> <div class="{theme.content}"> <div class="inner-content"></div> <yield></yield> <center> <button onclick="{close}" class="{uR.config.btn_primary}">{close_text}</button> <button each="{opts.buttons}" class="{className}" onclick="{_onclick}">{text}</button> </center> </div> </div>', '', '', function(opts) {

  var self = this;
  this.close_text = this.opts.close_text || "Close";
  this.on("mount",function() {
    uR.forEach(this.opts.buttons || [],function(b) {
      b._onclick = function(e) { b.onclick(e); self.unmount() }
    });
    self.update();
  });
  this.close = function(e) {
    this.opts.cancel && this.opts.cancel();
    this.unmount();
  }.bind(this)
});

(function() {
  uR.form = {}
  uR.form.parseChoices = function(choices) {
    // #! TODO This should eventually accomodate groupings as well like:
    // choices = [["group_name",[choice1,choice2,choice3]...],group2,group3]
    return choices.map(function(c) {
      if (typeof(c) == "string") { return [c,c]}
      return c;
    });
  }

  // this mixin is what gives custom input tags ur-input like powers
  riot.mixin({
    init: function() {
      if (!this.opts.is_ur_input) { return }
      this.parent = this.parent || this.opts.parent;
      this.value = "";
      this.setValue = function(v) {
        var old_value = this.value || "";
        if (old_value == v) { return };
        this.value = v;
        // send the value to the ur-input
        this.parent.onBlur({value: this.value,type: 'blur'});
        // update the ur-form
        this.parent.parent && this.parent.parent.update();
      }.bind(this);
    },
  });
})();

riot.tag2('image-input', '<img if="{initial_value}" riot-src="{initial_value}"> <input type="file" name="{name}" onchange="{onChange}">', '', '', function(opts) {
  this.on("mount", function() {
    this.name = this.opts.parent._name;
    this.update();
  });
  this.onChange = function(e) {
    var files = e.target.files;
    this.opts.parent.onChange(e);
  }.bind(this)

});

riot.tag2('ur-input', '<div class="help_click" if="{help_click}" onclick="{help_click.click}" title="{help_click.title}">?</div> <input if="{tagname == \'textinput\'}" type="{input_type}" name="{_name}" id="{id}" onchange="{onChange}" onkeyup="{onKeyUp}" onfocus="{onFocus}" onblur="{onBlur}" placeholder="{placeholder}" required="{required}" minlength="{minlength}" class="validate {empty:empty, invalid: invalid, active: activated} {uR.theme.input}" autocomplete="off" initial_value="{initial_value}"> <textarea if="{tagname == \'textarea\'}" name="{_name}" id="{id}" onchange="{onChange}" onkeyup="{onKeyUp}" onfocus="{onFocus}" onblur="{onBlur}" placeholder="{placeholder}" required="{required}" minlength="{minlength}" class="validate {empty:empty, invalid: invalid, active: activated} {uR.theme.input}" autocomplete="off">{value}</textarea> <select if="{tagname == \'select\'}" onchange="{onChange}" id="{id}" name="{_name}" class="{uR.config.select_class}"> <option if="{placeholder}" value="">{placeholder}</option> <option selected="{(choice[0]==parent.initial_value)?\'selected\':\'\'}" each="{choice in choice_tuples}" riot-value="{choice[0]}">{choice[1]}</option> </select> <label for="{id}" if="{_label}" class="{required: required}" onclick="{labelClick}" data-success="{data_success}">{_label}</label> <h5 if="{tagname == \'header\'}">{content}</h5> <div class="help_text" if="{help_text}"><i class="fa fa-question-circle-o"></i> {help_text}</div> <div class="error">{data_error}</div>', 'ur-input,[data-is="ur-input"]{ display: block; }', '', function(opts) {


  var self = this;
  this.onFocus = function(e) {
    var i = this.parent.fields.indexOf(this);
    this.activated = true;
    if (i != 0) { this.parent.fields[i-1].show_errors = true; }
  }.bind(this)

  this.onBlur = function(e) {
    var i = this.parent.fields.indexOf(this);
    if (i !=0 && this.parent.active) { this.show_errors = true; }
    uR.onBlur(this);
    this.last_value = undefined;
    this.activated = !!this.value;
    this.onChange(e);
  }.bind(this)

  this.labelClick = function(e) {
    if (self.input_type == "checkbox") {
      self.IS_CHECKED = !self.IS_CHECKED;
      e.value = self.value;
      self.onChange(e);
    }
  }.bind(this)

  this.onChange = function(e) {
    if (self.parent.active) { self.show_errors = true; }
    self.onKeyUp(e);
  }.bind(this)

  this.onKeyUp = function(e) {
    if (this.no_validation) { return; }
    if (e.type == "keyup") { this.parent.active = true; }
    this.value = e.value || (e.target && e.target.value);
    if (this.last_value == this.value && this.input_type != "checkbox") { return; }
    if (self.input_type == "checkbox") {
      self.root.querySelector("[type=checkbox]").checked = self.IS_CHECKED;
    }
    this.last_value = this.value;
    this.data_error = undefined;
    this.empty = !this.value;
    var invalid_email = !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(this.value);
    if (!this.required && !this.value) { invalid_email = false; }
    var has_value = (this.type == "checkbox")?this.IS_CHECKED:this.value.length;
    if (this.required && !has_value) {
      this.data_error = "This field is required.";
    }
    else if (this.value.length < this.minlength) {
      var type = (["number","tel"].indexOf(this.type) == -1)?" characters.":" numbers.";
      this.data_error = this.verbose_name + " must be at least " + this.minlength + type;
    }
    else if (this.type == "email" && invalid_email) {
      this.data_error = "Please enter a valid email address.";
    }
    if (!this.data_error && e.type == "blur") { this._validate(this.value,this); }

  }.bind(this)

  this.reset = function() {
    var target = self.root.querySelector("input,select,textarea");
    if (!target || ['checkbox','radio','submit'].indexOf(target) != -1) {
      return;
    }
    self.show_errors = false;
    self.value = self.initial_value || "";
    self.activated = (self.value != "") || self.input_type == "select" || self.input_type == "file";
    target.value = self.value;
    self.onKeyUp({target:target});
    self.update()
    self.parent.update();
  }

  this.on("mount", function() {

    this.name = this.name || this.type;
    this._name = (typeof(this.name) == "object")?this.name[0]:this.name;
    this.verbose_name = this.verbose_name || this.label || this.placeholder;
    if (!this.verbose_name) {
      var f = function(s){return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();};
      this.verbose_name = this._name.replace(/[-_]/g," ").replace(/\w\S*/g, f);
    }
    this._label = this.label || this.verbose_name;
    this.id = this.id || "id_" + this._name + this.parent.suffix;
    this.input_type = this.type || "text";
    this.validate = this.validate || function() {};
    if (uR.config.text_validators[this.input_type]) {
      this.validate = uR.config.text_validators[this.input_type];
      this.input_type = "text";
    }
    if (this.required == undefined) { this.required = true; }
    this._validate = (this.bounce)?uR.debounce(this.validate,this.bounce):this.validate;
    this.show_errors = false;
    this.tagname = "textinput";
    this.IS_CHECKED = self.initial_checked;
    this.form_class = uR.config.form.field_class;
    if (this.input_type == "hidden") {
      this.root.style.display = "none";
      this._label = "";
    }
    if (this.input_type == "select") {
      this.tagname = "select";
      if (this.placeholder) { this._label = undefined };
      function setChoices() {
        if (!self.choice_tuples) {
          self.verbose_choices = self.verbose_choices || self.choices;
          self.choice_tuples = [];
          for (var i=0;i<self.choices.length;i++) {
            self.choice_tuples.push([self.choices[i],self.verbose_choices[i]]);
          }
        }
        self.update();
        self.root.querySelector("select").value = self.initial_value;
      }
      if (!this.choices_url) { setChoices(); }
      else {
        uR.storage.remote(this.choices_url,function(choices) {
          self.choice_tuples = [];
          uR.forEach(choices,function (choice) {
            self.choice_tuples.push([choice[self.value_key || 0],choice[self.verbose_key] || 1]);
          });
          setChoices();
          self.update();
        });
      }
    }
    if (this.input_type == "textarea") { this.tagname = "textarea"; }
    if (this.input_type == "header") {
      this.tagname = "header";
      this.content = this._label;
      this._label = undefined;
      this.no_validation = true;
    }
    if (uR.config.tag_templates.indexOf(this.input_type) != -1) {
      this.tagname = this.input_type;
      var _e = document.createElement(this.input_type);
      this.root.insertBefore(_e,this.root.firstChild);
      setTimeout(function() { riot.mount(_e,{parent:self,form: self.parent,is_ur_input: true}); },0);
    }
    if (this.parent && this.parent.fields) { this.parent.fields.push(this); }

    var i_tries = 0;
    var interval = setTimeout(function() {
      var e = document.querySelector("#"+self.id);
      i_tries += 1;
      if (e && (i_tries++ > 5 || e.value)) {
        clearInterval(interval);
        self.onKeyUp({target: e});
      }
    },1000);
    self.monkey = 1;
    this.update();
    this.reset();
    this.onMount && setTimeout(this.onMount,0);
    if (this.extra_attrs) {
      for (k in this.extra_attrs) {
        this.root.querySelector("input").setAttribute(k,this.extra_attrs[k])
      }
    }
    if (this.label_after) {
      var s = document.createElement("span");
      s.innerHTML = this.label_after;
      var label = this.root.querySelector("label");
      label.parentNode.insertBefore(s,label.nextSibling);
    }
  });
  this.on("update", function() {
    this.invalid = this.data_error && this.show_errors;
  });
});

riot.tag2('ur-form', '<form autocomplete="off" onsubmit="{submit}" name="form_element" class="{opts.form_class}" method="{opts.method}"> <yield from="pre-form"></yield> <ur-input each="{schema}" class="{name} {type} {form_class}"></ur-input> <div if="{non_field_error}" class="non_field_error"> <div class="{uR.theme.error_class}">{non_field_error}</div> <p if="{uR.config.support_email}" style="text-align: center;"> If you need assistance contact <a href="mailto:{uR.config.support_email}">{uR.config.support_email}</a> </p> </div> <div class="button_div"> <yield from="button_div"></yield> <button class="{btn_success} {disabled: !valid}" id="submit_button" onclick="{submit}">{success_text}</button> <button class="{btn_cancel}" if="{opts.cancel_function}" onclick="{opts.cancel_function}">{cancel_text}</button> </div> <ul class="messagelist" if="{messages.length}"> <li class="{level}" each="{messages}">{body}</li> </ul> </form>', '', '', function(opts) {

  var self = this;
  this.btn_success = this.opts.btn_success || uR.config.btn_success;
  this.btn_cancel = this.opts.btn_cancel || uR.config.btn_cancel;
  this.cancel_text = this.opts.cancel_text || uR.config.cancel_text;

  this.submit = function(e,_super) {
    if (this._ajax_busy) { return; }
    if (!this.valid) {
      uR.forEach(this.fields,function (field) {
        field.show_errors = true;
        field.update();
      })
      return;
    }

    this.non_field_error = undefined;
    var alt_submit = this.opts.submit || (this.parent && this.parent.submit);
    if (!_super && alt_submit) {
      if (alt_submit == "noop") {
        var form = this.root.querySelector("form");
        var e = document.createElement('input');
        e.type = "hidden";
        e.name = "csrfmiddlewaretoken";
        e.value = document.querySelector("[name=csrfmiddlewaretoken]").value;
        form.appendChild(e);
        form.submit()
      }
      else { alt_submit(this); }
    } else {
      uR.ajax({
        url: this.opts.action,
        method: this.opts.method,
        data: this.getData(),
        success: this.ajax_success,
        success_attribute: this.opts.success_attribute,
        error: this.ajax_error,
        target: this.submit_button,
        that: self
      });
    }
  }.bind(this)
  this.clear = function() {
    this.initial = this.empty_initial;
    uR.storage.set(this.opts.action,null);
    uR.forEach(this.fields, function(field) { field.initial_value = self.initial[field.name]; field.reset(); })
    this.messages = [];
    self.active = false;
    setTimeout(function() {
      var f = self.root.querySelector("input:not([type=hidden]),select,textarea"); f && f.focus();
    },0)
  }.bind(this)
  this.addField = function(field) {
    var f = {};
    if (typeof field == "string") {
      var name = field;
      if (uR.schema.fields[field]) {
        field = uR.schema.fields[field];
        field.name = name;
      } else {
        field = { name: field, type: 'text' }
      }
    }
    for (k in field) { f[k] = field[k]; }
    if (f.type == "checkbox") {
      f.value = true;
      f.initial_value = f.value;
      f.initial_checked = self.initial[f.name];
    } else {
      f.initial_value = f.value || self.initial[f.name];
    }
    self.schema.push(f);
  }
  this.getData = function() {
    var data = {};
    uR.forEach(this.fields,function(f) { data[f._name] = f.value; });
    return data;
  }.bind(this)
  this.on("mount",function() {
    var _parent = this.parent || {};
    _parent.ur_form = this;
    _parent.opts = _parent.opts || {};
    this.ajax_success = this.opts.ajax_success || _parent.opts.ajax_success || _parent.ajax_success || function() {};
    if (this.opts.success_redirect) {

      this._ajax_success = this.ajax_success;
      this.ajax_success = function() { self._ajax_success();window.location = this.opts.success_redirect; }
    }
    this.ajax_error = this.opts.ajax_error || _parent.opts.ajax_error || _parent.ajax_error || function() {};
    this.messages = [];
    var _schema = this.opts.schema || _parent.opts.schema || _parent.schema;
    if (typeof _schema == "string") {
      this.schema_url = _schema;
      if (uR.schema[this.schema_url]) {
        _schema = uR.schema[this.schema_url];
      } else {
        var url = _schema;
        uR.getSchema(url,this.mount.bind(this));
        _schema = [];
        return;
      }
    }
    this.schema = [];
    this.empty_initial = uR.schema.__initial[this.schema_url] || this.opts.initial || _parent.opts.initial || {};
    this.initial = uR.storage.get(this.opts.action) || this.empty_initial;
    uR.forEach(_schema,this.addField);
    this.suffix = this.opts.suffix || "";
    this.success_text = this.opts.success_text || "Submit";
    this.fields = [];
    this.update();
    if (this.fields.length && !opts.no_focus) {
      setTimeout(function() {
        var f = self.root.querySelector("input:not([type=hidden]),select,textarea");
        f && f.focus();
        (self.opts.post_focus || function() {})(self);
      },0)
    }
  });
  this.on("update",function() {
    if (this._multipart) { this.form_element.enctype='multipart/form-data'; }
    this.valid = true;
    if (!this.fields) { return }
    uR.forEach(this.fields,function(field,i) {
      if (field.no_validation) { return }
      self.valid = self.valid && !field.data_error;
    })
    if (this.opts.autosave) { this.autoSave(); }
  });
  this.autoSave = uR.dedribble(function() {

    var new_data = this.getData();

    uR.storage.set(this.opts.action,new_data);
  }.bind(this),1000);
});

riot.tag2('ur-formset', '<ur-form each="{form,i in forms}" suffix="{⁗_⁗+i}" success_text="Add"> <div class="message font-20" if="{next}"> <b>{name}</b> has been successfully added!<br> Add more children or click <b>Next</b> to continue. </div> </ur-form> <button class="{uR.config.btn_primary}" disabled="{!valid}">Next</button>', '', '', function(opts) {
  var self = this;
  this.forms = [];
  this.on("mount",function() {
    this.forms.push({schema:this.opts.schema});
    this.update();
  });
  this.submit = function (element) {
    var form_data = {}
    for (var key in element.inputs) { form_data[key] = element.inputs[key].value }
    uR.ajax({
      method: "POST",
      url: this.opts.action,
      data: form_data,
      target: element.root,
      self: element,
      loading_attribute: "mask",
      success: function(data) { element.name = form_data.name; self.update();}
    });
  }.bind(this)
});

riot.tag2('four-oh-four', '<h1>Error 404: Page Not Found</h1> <div onclick="{next}">{current}</div>', 'four-oh-four,[data-is="four-oh-four"]{ display: flex; align-items: center; flex-flow: column; height: 100%; justify-content: center; text-align: center; } four-oh-four,[data-is="four-oh-four"]{ font-size: 2em; }', '', function(opts) {


  this.quotes = uR.config.quotes_404 || [
    "Somethings aren't meant to be questioned.\n Most things actually.",
    "May you find love.\n May you find it wherever it's been hidden.\n May you find who has been hiding it\n and exact revenge upon them.\n As the old song goes: 'Love is all you need to destroy your enemies.' Finer words were never chanted.",
    "Not all who wander are found.",
    "Time is weird. So is space. I hope ours match some day.",
    "When life seems dangerous and unmanageable, just remember that it is, and that you can't survive forever.",
    "If at first you don't succeed, look around you and try to find out who is trying to sabotage you with telepathic interference.\n It is someone you know.",
    "[A webpage's] existence is not impossible but also not very likely.",
    "If you see something say nothing, and drink to forget",
    "I am found! I am found! I am found! Stop looking for me and find yourself!",
  ];
  this.on("update",function() {
    this.current = this.quotes[Math.floor(Math.random()*this.quotes.length)];
    document.title = "Erika";
  })
  this.next = function(e) {
    this.update();
  }.bind(this)
});

riot.tag2('konsole', '<div class="left"> <u>Logs:</u> <div each="{log}"> {text} </div> </div> <div class="right"> <u>Watches:</u> <div each="{watch}"> <b>{key}:</b> {value} </div> </div>', 'konsole,[data-is="konsole"]{ background: rgba(255,255,255,0.8); bottom: 0; height: 200px; position: fixed; right: 0; width: 400px; } konsole .left,[data-is="konsole"] .left,konsole .right,[data-is="konsole"] .right{ border: 1px solid; box-sizing: border-box; float: left; height: 100%; padding: 5px; width: 50%; }', '', function(opts) {


  watch_keys = [];
  watch_ings = {};
  this.log = [];
  var that = this;
  window.konsole = {
    log: function(v) { that.log.push({ text:v }); that.update(); },
    watch: function(k,v) {

      if (watch_keys.indexOf(k) == -1) { watch_keys.push(k); }
      watch_ings[k] = v;
      that.update();
    }
  }

  this.on('update',function() {
    this.watch = [];
    for (var i=0;i<watch_keys.length;i++) {
      var k = watch_keys[i];
      this.watch.push({key: k, value: watch_ings[k]});
    }
  });
});

riot.tag2('markdown', '<yield></yield>', '', '', function(opts) {
  this.on("mount",function() {
    var content = this.content ||this.opts.content || this.root.innerHTML;
    if (this.opts.url && !content) {
      uR.ajax({
        url: this.opts.url,
        success: (function(data,request) {
          this.opts.content = request.responseText;
          this.mount();
        }).bind(this)
      });
      return
    }
    this.root.innerHTML = markdown.toHTML(content.replace("&amp;","&"));
  });
});

// depracated, don't use!

riot.tag2('modal', '<div class="mask" onclick="{cancel}"></div> <div class="inner"> <a onclick="{cancel}" class="cancel">X</a> <yield></yield> <center> <button class="{uR.config.btn_cancel}" onclick="{cancel}" if="{cancel_text}">{cancel_text}</button> <button class="{uR.config.btn_success}" onclick="{success}" if="{success_text}">{success_text}</button> </center> </div>', 'modal,[data-is="modal"]{ display: block; position: fixed; display: -ms-flexbox; display: -webkit-flex; display: flex; justify-content: center; overflow: hidden; z-index: 10000; } modal.absolute,[data-is="modal"].absolute{ position: absolute; } @media (max-width: 480px) { modal.absolute,[data-is="modal"].absolute{ position: fixed; } } modal,[data-is="modal"],modal .mask,[data-is="modal"] .mask{ bottom: 0; left: 0; right: 0; top: 0; -webkit-justify-content: center; justify-content: center; -webkit-align-items: center; align-items: center; } modal .cancel,[data-is="modal"] .cancel{ background: black; color: white; cursor: pointer; display: block; height: 26px; line-height: 26px; position: absolute; right: 0; text-align: center; text-decoration: none; top: 0; width: 26px; z-index: 1; } modal .mask,[data-is="modal"] .mask{ background: rgba(0,0,0,0.3); position: absolute; z-index: 1; } modal > .inner,[data-is="modal"] > .inner{ align-self: center; display: inline-block; background: white; max-height: 100%; max-width: 100%; overflow: auto; padding: 25px 25px 30px; position: relative; z-index: 2; }', '', function(opts) {


  var self = this;
  if (window.HOMER) { self.mixin(HOMER.StaticMixin); }
  this.cancel = function(e) {
    (self.opts.cancel || function(){})(e);

    !self.opts.stay_mounted && self.unmount();
  }.bind(this)
  this.success = function(e) {
    (self.opts.success || function(){})();
    !self.opts.stay_mounted && self.unmount();
  }.bind(this)
  this.on("update",function() {
    this.modal_class = this.opts.modal_class || "";
    this.cancel_text = this.opts.cancel_text;
    this.success_text = this.opts.success_text;
    if (this.parent && this.parent.opts && this.parent.opts.modal_class) {
      this.modal_class += " "+ this.parent.opts.modal_class;
    }
    this.root.className = this.modal_class;
  });
});

uR.config.tag_templates.push("multi-file");
uR.config.tmp_file_url = "/media_files/private/";

riot.tag2('multi-file', '<form action="{action}" method="POST" if="{can_upload}"> <label class="{uR.config.btn_primary}"> <input type="file" onchange="{validateAndUpload}" style="display:none;" name="file"> {opts.parent.upload_text || \'Upload another file\'} </label> </form> <div each="{files}" class="file {uR.config.alert_success}"> <div> <div class="name">{name}</div> <div class="content_type">{content_type}</div> </div> <div onclick="{parent.deleteFile}" class="fa fa-trash"></div> </div> <div if="{error_msg}" class="{uR.theme.error_class}">{error_msg}</div>', '', '', function(opts) {

  this.parent = this.opts.parent;
  var self = this;
  this.validateAndUpload = function(e) {
    var form = this.root.querySelector("form");
    this.error_msg = undefined;
    uR.ajax({
      form: form,
      success: function(data) {
        this.files.push(data);
        uR.storage.set(this.action+"__files",this.files);
      },
      error: function(data) {
        self.error_msg = "An unknown error has occurred.";
      },
      that: this,
    });
    this.root.querySelector("[type=file]").value = "";
  }.bind(this)
  this.deleteFile = function(e) {
    uR.forEach(this.files,function(f,i) {
      if (f.id == e.item.id) { self.files.splice(i,1) }
    });
    uR.storage.set(this.action+"__files",this.files);
  }.bind(this)
  this.on("mount",function() {
    this.max_files = this.parent.max_files || Infinity;
    this.action = opts.action || uR.config.tmp_file_url;
    this.files = uR.storage.get(this.action+"__files") || [];
    this.update();
  });
  this.on("update",function() {
    this.setValue((this.files || []).map(function(f) { return f.id }).join(","));
    this.can_upload = !(this.files && this.files.length >= this.max_files);
  });
});

riot.tag2('slideshow', '<div class="scroll-outer"> <div class="slide-wrap"><yield></yield></div> </div> <div if="{opts.controls == ⁗arrows⁗}"> <a onclick="{next}" class="arrow next" riot-style="width: {arrow_size}px"></a> <a onclick="{prev}" class="arrow prev" riot-style="width: {arrow_size}px"></a> </div> <div if="{opts.controls == ⁗slides⁗}" class="controls"> <a onclick="{scrollTo}" class="scroll-to {current: i == parent.current_slide}" each="{i in _slides}"></a> </div>', '', '', function(opts) {

  var self = this;
  this.on("mount",function() {
    this.slides = this._slides = this.root.querySelectorAll("slide");
    this.scroll_outer = this.root.querySelector(".scroll-outer");
    this.slide_wrap = this.root.querySelector(".slide-wrap");

    this.max_slide = this.slides.length;
    this.min_slide = 0;

    this.current_slide = this.min_slide;
    this.root.setAttribute("data-after-text",this.current_slide);
    this.animation_time = 1000;
    this.animate_proxy = this.animate;
    window.addEventListener("resize", uR.debounce(this.update.bind(this)),1000);
    this.opts.visible = this.opts.visible || "max";
    this.root.style.display = "block";
    this.update();
  });
  this.animate = function() {
    var t = new Date().valueOf()-self.start_time;
    var d = self.animation_time;
    t = Math.min(t/d,1);
    var ratio = Math.min(-t*(t-2),1);
    self.scroll_outer.scrollLeft = self.start_left + self.d_left*ratio;
    self.root.setAttribute("data-before-text",self.scroll_outer.scrollLeft);
    if (ratio != 1) {
      cancelAnimationFrame(self.animation_frame);
      self.animation_frame = requestAnimationFrame(self.animate_proxy);
    }
  }.bind(this)
  this.on("update",function() {

    this.slide_width = 410;

    if (document.body.scrollWidth < 2*this.slide_width) { return }
    if (this.opts.visible == "max") {
      this.visible = Math.floor(this.root.offsetWidth / this.slide_width);
    } else { this.visible = this.opts.visible; }
    if (this.scroll_outer.offsetWidth != this.visible*this.slide_width) {
      this.max_slide = Math.floor(this.slides.length/this.visible);
      this._slides = [];
      var i = 0;
      while (i<this.max_slide) { this._slides.push(i); i++; }
      this.scroll_outer.style.width = (this.visible*this.slide_width)+"px";
      this.slide_wrap.style.width = (this.slide_width*this.slides.length)+"px";
      cancelAnimationFrame(this.animation_frame);
      this.scroll_outer.scrollLeft = this.current_slide * this.slide_width;
    }
  })
  this.scrollTo = function(e) {
    this.current_slide = e.item.i;
    this.scroll();
  }.bind(this)
  this.scroll = function() {

    this.start_left = this.scroll_outer.scrollLeft;
    this.start_time = new Date().valueOf();
    this.end_left = this.current_slide * this.slide_width * this.visible;
    this.d_left = this.end_left - this.start_left;
    this.animation_frame = requestAnimationFrame(this.animate_proxy,17);
    this.root.setAttribute("data-after-text",this.current_slide);
  }.bind(this)
  this.next = function(e) {
    this.current_slide++;
    if (this.current_slide > this.max_slide) {

      this.scroll_outer.scrollLeft = this.slide_width;
      this.current_slide = this.min_slide;
    }
    this.scroll();
  }.bind(this)
  this.prev = function(e) {
    this.current_slide--;
    if (this.current_slide < this.min_slide) {

      this.current_slide = this.max_slide-1;
      this.scroll_outer.scrollLeft = this.slide_width * (this.current_slide+1);
    }
    this.scroll();
  }.bind(this)
});

riot.tag2('ur-tabs', '<div class="tab-anchors"> <a onclick="{showTab}" each="{tabs}" class="{active: title == parent.active_title}"> {title}</a> </div> <yield></yield>', 'ur-tabs .tab-anchors a,[data-is="ur-tabs"] .tab-anchors a{ color: inherit; cursor: pointer; display: inline-block; padding: 5px; border: 1px solid; } ur-tabs .tab-anchors a.active,[data-is="ur-tabs"] .tab-anchors a.active{ text-decoration: underline; }', '', function(opts) {


  this.showTab = function(e) {
    this.active_title = e.item.title;
  }.bind(this)

  this.on("mount",function() {

    this.tabs = this.tags['ur-tab'];
    if (this.tabs && !this.tabs[0]) { this.tabs = [this.tabs] }
    this.active_title = this.tabs[0].title;
    this.update();
  });
});

riot.tag2('ur-tab', '<yield></yield>', 'ur-tab,[data-is="ur-tab"]{ border: 1px solid; box-sizing: border-box; display: block; height: 400px; max-width: 100%; overflow-y: auto; padding: 5px; width: 650px; } ur-tab.hidden,[data-is="ur-tab"].hidden{ display: none; }', '', function(opts) {


  this.title = opts.title;
  this.on("update",function() {
    this.root.className = (this.opts.title == this.parent.active_title)?"":"hidden";
  });
});

//# sourceMappingURL=unrest-built.js.map
