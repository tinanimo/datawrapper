// Datawrapper
(function(){

    // Require Underscore, if we're on the server, and it's not already present.
    var root = this;
    var _ = root._;
    var $ = root.jQuery || root.Zepto || root.ender;


    // Datawrapper.UI
    // --------------

    var UI = Datawrapper.UI = function() {

        this.initialize();

    };

    _.extend(UI.prototype, {

        initialize: function() {
            this.initializeSignUp();
            this.initializeLogout();

            $('a[data-toggle=modal]').click(function(e) {
                var a = $(e.target),
                    tgt = $(a.data('target'));
                tgt.modal();
            });
        },

        checkPasswordStrength: function(pwd) {
            //return $.trim(pwd).length > 7;
            return true;
        },

        refreshHeader: function() {
            $.get('/xhr/header/create', function(header) {
                $('.header .toplinks').replaceWith(header);
                DW.initializeSignUp();
                DW.initializeLogout();
            });

            // reload login form on homepage
            var homeLogin = $('#home-login');
            if (homeLogin.length > 0) {
                homeLogin.load('/xhr/home-login', null, function() {
                    DW.initializeSignUp();
                    DW.initializeLogout();
                });
            }
        },

        initializeSignUp: function() {

            function refreshSalt() {
                $.getJSON('/api/auth/salt', function(res) {
                   if (res.status == 'ok') {
                      $('#btn-register').data('salt', res.data.salt);
                      $('.btn-login').data('salt', res.data.salt);
                      $('.btn-login').data('time', res.data.time);
                   }
                });
            }

            $('a[href=#login]').click(function() {
                $('#dwLoginForm').modal();
                $('#dwLoginForm .alert').remove();

                var logEmail = $('#home-login .login-form .login-email'),
                    logPwd = $('#home-login .login-form .login-pwd');
                if (logEmail.val() !== '') $('#register-email').val(logEmail.val());
                if (logPwd.val() !== '') $('#register-pwd').val(logPwd.val());

                refreshSalt();
                return false;
            });

            refreshSalt();

            $('#btn-register').click(function() {
               var pwd = $.trim($('#register-pwd').val()),
                   pwd2 = $.trim($('#register-pwd-2').val());

               if (pwd == pwd2) {
                  if (true) {
                     var payload = {
                        email: $('#register-email').val(),
                        pwd: CryptoJS.HmacSHA256(pwd, $('#btn-register').data('salt')).toString(),
                        pwd2: CryptoJS.HmacSHA256(pwd2, $('#btn-register').data('salt')).toString()
                     };
                     $.ajax({
                        url: '/api/users',
                        type: 'POST',
                        data: JSON.stringify(payload),
                        dataType: 'json',
                        context: this,
                        success: function(data) {
                            if (data.status == 'ok') {
                                // If the registration went well, clear sign up form
                                $('.signup-form input').val('');
                                // and close popup. User should be logged in now.
                                DW.logMessage('Yeah, sign up went well! You are logged in now...', '.signup-form');
                                setTimeout(function() {
                                    $('#dwLoginForm').modal('hide');
                                    DW.refreshHeader();
                                }, 1000);
                            } else {
                                DW.logError(data.code, '.signup-form');
                            }
                        }
                     });
                  } else {
                     alert('Error: password is to unsecure. please chose a password with at least 8 characters');
                  }
               } else {
                  alert('Error: password mismatch');
               }
            });

            function loginEvent(evt) {
                var loginForm = $(evt.target).parents('.login-form'),
                  lgBtn = $('.btn-login', loginForm),
                  hmac = CryptoJS.HmacSHA256,
                  pwd = $('.login-pwd', loginForm).val(),
                  hash = hmac(hmac(pwd, lgBtn.data('salt')).toString(), String(lgBtn.data('time'))).toString(),
                  payload = {
                     email: $('.login-email', loginForm).val(),
                     pwhash: hash,
                     time: lgBtn.data('time')
                  };

                if (pwd === '') {
                    $('.login-pwd', loginForm).parent().addClass('error');
                    return false;
                }

                $('.control-group', loginForm).removeClass('error');

                $.ajax({
                    url: '/api/auth/login',
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify(payload),
                    success: function(data) {
                        if (data.status == "ok") {
                            $('#dwLoginForm').modal('hide');
                            $('input', loginForm).val('');
                            DW.refreshHeader();
                        } else {
                            if (data.code == 'login-invalid') {
                                $('.login-pwd', loginForm).parent().addClass('error');
                            } else if (data.code == 'login-email-unknown') {
                                $('.login-email', loginForm).parent().addClass('error');
                            }
                            DW.logError(data.message, loginForm);
                        }
                    }
                });
            }

            // log in on login button click
            $('.btn-login').click(loginEvent);
            // log in on email,pwd enter press
            $('.login-form input').keyup(function(evt) {
                if (evt.keyCode == 13) loginEvent(evt);
            });

        },

        initializeLogout: function() {
            $('a[href=#logout]').click(function() {
                $.ajax({
                    url: '/api/auth/logout',
                    type: 'POST',
                    success: function(data) {
                        // DW.refreshHeader();
                        // sometimes it's a good idea to redirect
                        location.href = '/';
                    }
                });
                return false;
            });
        },

        logMessage: function(msg, parent, type) {
            if (!_.isFunction(parent.prepend)) parent = $(parent);
            $('.alert', parent).remove();
            if (type === undefined) type = 'success';
            var alert = $('<div class="alert alert-'+type+'" />');
            alert.append('<a class="close" data-dismiss="alert" href="#">&times;</a>');
            alert.append('<div>'+msg+'</div>');
            parent.prepend(alert);
            $(".alert").alert();
        },

        logError: function(msg, parent) {
            this.logMessage(msg, parent, 'error');
        }
    });


    // -- now run datawrapper user interface
    $(function() {
        window.DW = new Datawrapper.UI();
    });


}).call(this);