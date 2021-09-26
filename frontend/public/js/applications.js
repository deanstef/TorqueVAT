$( document ).ready( e => {
    $("#application-form .submit").click( e => {
        e.preventDefault();
        let application = $("#application-form [name='toAddress'] :selected");
        let type = application.attr("data-type");
        let amount = application.attr("data-amount");
        let id = application.attr("data-id");
        let token_id = application.attr("data-token-id");

        $("#application-form input[name='amount']").val(amount);
        $("#application-form input[name='applicationId']").val(id);
        $(`#application-form input[name='tokenId']`).val(token_id);

        $("#application-form").submit();
    });

}); 