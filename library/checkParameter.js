module.exports = function (parameters_from_user, rules) {
    let empty_parameters = [];
    for(let rule of rules){
        if(rule in parameters_from_user){

        }else{
            empty_parameters.push(rule);
        }
    }

    empty_parameters = empty_parameters.join(", ");
    return empty_parameters;
};