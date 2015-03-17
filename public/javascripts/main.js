//main.js
// lazy js dynamic handler for views
// most of them are not required everywhere, but i put everything in a dirty way for conveniance (ie. lazyness)
// should be improved, some day
$(function() {
  var pushserver = {
    devBlock: $('#deviceBlock'),
    appBlock: $('#applicationBlock'),
    targetBlock: $('#targetBlock'),
    selectDevice: $("#inputDevice"),
    selectApplication: $("#inputApplication"),
    selectApplications: $("#inputApplications"),
    // initialize the modal system
    modal: function(title, message, okCallback) {
      $('#ps-modal .modal-body p').html(message);
      $('#ps-modal .modal-title').html(title);
      $('#ps-modal [data-ok="modal"]').click(function(e) {
        okCallback();
      });
      $('#ps-modal').modal('show');
    },
    // modal for deleting action in list views
    deleteModal: function() {
      $('[data-delete-id]').click(function(e) {
        var idDelete = $(this).attr('data-delete-id');
        var nameDelete = $(this).attr('data-delete-name');
        var urlDelete = $(this).attr('href');
        var callback = function() {
          $.ajax({
            'type': 'DELETE',
            'url': urlDelete,
            success: function(data) {
              $('#ps-modal').modal('hide');
              document.location.reload();
            }
          });
        };
        pushserver.modal('Delete an element', 'You are about to delete element "<strong>' + nameDelete + '</strong>" with ID <em>' + idDelete + "</em>.<br/>Are you sure ?", callback);
      });
    },
    // push type selector 
    pushType: function() {
      $('#targetType').change(function(e) {
        pushserver.devBlock.hide();
        $('input', pushserver.devBlock).attr('disabled', 'disabled');
        pushserver.appBlock.hide();
        $('select', pushserver.appBlock).attr('disabled', 'disabled');
        pushserver.targetBlock.hide();
        $('select', pushserver.targetBlock).attr('disabled', 'disabled');

        switch ($(this).val()) {
          case "3":
            pushserver.devBlock.show();
            pushserver.appBlock.show();
            $('input', pushserver.devBlock).removeAttr('disabled');
            $('select', pushserver.appBlock).removeAttr('disabled');
            break;
          case "2":
            pushserver.appBlock.show();
            $('select', pushserver.appBlock).removeAttr('disabled');
            break;
          case "1":
            pushserver.targetBlock.show();
            $('select', pushserver.targetBlock).removeAttr('disabled');
            break;
        }
      });
    },
    // the device selection in the push form : target, app, or device, using select2 
    deviceSelection: function() {
      //url: "/api/devices",
      // application: pushserver.selectApplication.val()
      /*
            res.push({
              id: item.id,
              text: item.name || 'No name'
        */
      
      //pushserver.selectDevice.select2("destroy");
      pushserver.selectDevice.select2({
        theme : "classic",
        minimumInputLength: 3,
        placeholder : "Search for a device name",
        ajax: {
          url: "/api/devices",
          dataType: "json",
          delay: 250,
          method : "GET",
          data: function(params) {
            return {
              name: params.term, // search term
              application : pushserver.selectApplication.val(),
              limit: 10
            };
          },
          processResults: function(data, page) {
            // parse the results into the format expected by Select2.
            // since we are using custom formatting functions we do not need to
            // alter the remote JSON data
            console.log(data);
            var results = data;
            results.forEach(function(item,index){
              item.text = item.name;
            });
            return {
              "results": results
            };
          },
        }
      });
    },
    // replace the submit of the push form by a custom action
    pushAction: function() {
      var urlPush = '/api/pushes/push';
      $('#pushForm').submit(function(e) {
        var simulate = $("input[type=checkbox]", this)[0].checked, badgeCount=0,tokensContent="";
        e.preventDefault();
        $.ajax({
          url: urlPush,
          data: $(this).serialize(),
          method: 'POST',
          dataType: 'json',
          success: function(data) {
            toastr.success("Push submitted succesfully");
            if (simulate) {
              // sum up tokens 
              data.forEach(function(item){
                badgeCount+=item.tokensCount;
                tokensContent += item.tokens.join("<br/>");
              });
              $("#tokens .badge").html(badgeCount);
              $("#tokensContent").html(tokensContent);

              $("#tokens").show();
              $('html, body').animate({
                scrollTop: $("#tokensContent").offset().top
              }, 2000);
            } else {
              $("#tokens").hide();
            }
            // : "' +  $('textarea[name=payload]').val() + '"',"Pushserver");
            $('#inputPayload')[0].reset();
          },
          error: function(data, err) {
            console.error(data);
            console.error(err);
            toastr.error("Error :" + JSON.stringify(data.responseJSON), "Pushserver");
          }
        });
      });
    },
    // handle the push form : the device selector
    pushEvent: function() {
      if (pushserver.targetBlock.length) {
        pushserver.selectApplication.change(function(e) {
          pushserver.deviceSelection();
        });
      }
    },
    // handle the multiselect in forms
    applicationsMultiselect: function() {
      pushserver.selectApplications.selectpicker();
    },
  };
  // the toaster system
  $(document).ready(function() {
    toastr.options = {
      "closeButton": true,
      "debug": false,
      "positionClass": "toast-top-right",
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "5000",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    };
    // boom, everything, everywhere, anytime
    // BAD BAD BAD
    pushserver.deleteModal();
    pushserver.deviceSelection();
    pushserver.pushType();
    pushserver.pushAction();
    pushserver.applicationsMultiselect();
    pushserver.pushEvent();
  });
});