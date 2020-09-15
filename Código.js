function doGet(request) {//Esta función permite que se ejecute primero la páfina index.html
    return HtmlService.createTemplateFromFile('index')
    .evaluate();
}

function include(filename) {//Esta función activa la importacion de elementos al html
    return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function usuariosAutorizados(email){
    Logger.log(email);
    let usuarios = [{
        email : "roystandenb@gmail.com"
    },{
        email : "admin@institutodetierrasblancas.cl"
    },{
        email : "monitoreo.classroom@institutodetierrasblancas.cl"
    }];
    let autorizado = false;
    usuarios.forEach((usuario)=>{
        if(usuario.email==email){
            autorizado = true;
        }
    });
    return autorizado;
}

function obtenerNombreUsuario(){
    var email = Session.getEffectiveUser().getEmail();
    var self = ContactsApp.getContact(email);

    // If user has themselves in their contacts, return their name
    if (self) {
        // Prefer given name, if that's available
        var name = self.getGivenName();
        // But we will settle for the full name
        if (!name) name = self.getFullName();
        return name;
    }
    // If they don't have themselves in Contacts, return the bald userName.
    else {
        var userName = Session.getEffectiveUser().getUsername();
        return userName;
    }
}

var idSheet = '1IwICYBULL_9qbfkl0IEBfqhoVMLxPSawl6N5UVMvUe0';

function obtenerDatosDeUnExcel(id,nombreHoja,cantidadColumnas){
    //Logger.log(id,nombreHoja,cantidadColumnas);
    var ss = "";
    var ws = "";
    var data = [];
    try {
        ss = SpreadsheetApp.openById(id)
        ws = ss.getSheetByName(nombreHoja);
        data = ws.getRange(1, 1, ws.getLastRow(),cantidadColumnas).getValues();
        if(data.length==0){
            data = [];
        }
        return data;
    } catch (error) {
        Logger.log(error);
        return [];
    }
}

function rangoRegistros (cantidadPorPagina,paginaActual,totalRegistros){
    let paginas = [];
    let rangoInicial = (parseInt(cantidadPorPagina) * parseInt(paginaActual)) - parseInt(cantidadPorPagina);
    let rangoFinal = (parseInt(rangoInicial) + parseInt(cantidadPorPagina));

    if(parseInt(totalRegistros)<parseInt(rangoFinal)){
        rangoFinal = totalRegistros;
        if(parseInt(rangoInicial)>parseInt(totalRegistros)){
            rangoInicial = 0;
        }
    }

    /*console.log("rangoInicial "+rangoInicial);
    console.log("rangoFinal "+rangoFinal);
    console.log("totalRegistros "+totalRegistros);*/

    
    if(rangoFinal>totalRegistros){
        rangoFinal = totalRegistros;
    }
    rangoFinal = parseInt(rangoFinal) -1;
    if(rangoFinal<0){
        rangoFinal = 0;
    }

    for(let x=rangoInicial;x<=rangoFinal;x++){
        paginas.push({
            numero : x
        });
    }
    return {
        rangoInicial : rangoInicial,
        rangoFinal : rangoFinal,
        paginas : paginas
    };
}

function obtenerDatos(cantidadPorPagina,paginaActual,nombreHoja,cantidadColumnas,cabeceras,camposBuscar,consultaBase = null){
    //Logger.log(cantidadPorPagina,paginaActual,nombreHoja,cantidadColumnas,cabeceras,camposBuscar,consultaBase);
    let registros = obtenerDatosDeUnExcel(idSheet,nombreHoja,cantidadColumnas);
    //Logger.log(registros);
    if(consultaBase!=null){
        //Ejemplo
        //Select * FROM ? WHERE [1] LIKE '%admin%' AND [0] = 1
        //[1] hace referencia que es la segunda casilla de la planilla excel
        
        registros = alasql(consultaBase,[registros]);
    }
    if(camposBuscar.length>0){
        let sql = 'SELECT * FROM ? WHERE ';
        camposBuscar.forEach((campo, index)=>{
            index == 0 ? sql += `[${campo.posicion}] LIKE '%${campo.valorCampo}%' ` : sql += `AND [${campo.posicion}] LIKE '%${campo.valorCampo}%' `
            
        });
        registros = alasql(sql,[registros]);
    }
    registros = registros.reverse();//Ponemos los datos desde el ultimo hasta el primero ingresado
    let rango = rangoRegistros(cantidadPorPagina,paginaActual,registros.length)
    let rangoInicio = rango.rangoInicio;
    let rangoFinal = rango.rangoFinal;

    if(registros.length>0){
        let arrayDatos = [];
        rango.paginas.forEach(rangoDatos=>{
            let datos = registros[rangoDatos.numero];
            //------Cada vez que se ejecute un ciclo se creará esta variable y al final se almacenará en el vector
            let union = [];
            let bandera = true;
            cabeceras.forEach(regCabecera=>{
                if(bandera==true){
                    bandera = false;
                    //registros[regCabecera.posicion]
                    union = {[regCabecera.nombreDato] : String(datos[regCabecera.posicion])};
                }else{
                    union = Object.assign(union,{[regCabecera.nombreDato] :String(datos[regCabecera.posicion])});
                }
            });
            arrayDatos.push(union);
            //---------------Fin almacenaje------------------------------------
        });
        return {
                registros : arrayDatos,
                totalRegistros : registros.length
        };
    }
    
    return [];
}

function eliminarRegistro(idEliminar,nombreHoja){
    var ss = "";
    var ws = "";
    var data = [];
    ss = SpreadsheetApp.openById(idSheet)
    ws = ss.getSheetByName(nombreHoja);
    var numeroTotalFilas = ws.getDataRange().getLastRow();
    //Obtenemos la columna 1, desde la fila 1, hasta el numero total de filas, obtenemos los datos y los convertimos en String
    var ids = ws.getRange(1,1,numeroTotalFilas).getValues().map(r=> r[0].toString());
    Logger.log("Encontrados");
    Logger.log(ids);
    //Buscamos el id en el vector obtenido anteriormente
    let indiceDelId = ids.indexOf(idEliminar.toString().toLowerCase());
    Logger.log("Indice a eliminar");
    Logger.log(indiceDelId);
    ws.deleteRow(parseInt(indiceDelId)+1);
}

function editarRegistro(id,datos,nombreHoja){
    const cantidadDatos = parseInt(datos[0].length);
    var ss = "";
    var ws = "";
    var data = [];
    ss = SpreadsheetApp.openById(idSheet)
    ws = ss.getSheetByName(nombreHoja);
    var numeroTotalFilas = ws.getDataRange().getLastRow();
    //Obtenemos la columna 1, desde la fila 1, hasta el numero total de filas, obtenemos los datos y los convertimos en String
    var ids = ws.getRange(1,1,numeroTotalFilas).getValues().map(r=> r[0].toString());
    //Buscamos el id en el vector obtenido anteriormente
    let indiceDelId = ids.indexOf(id.toString().toLowerCase());
    Logger.log(indiceDelId);
    ws.getRange(parseInt(indiceDelId)+1, 2, 1, cantidadDatos).setValues(datos);
}

function agregarRegistro(datos,nombreHoja){
    const hojaDeCalculo = SpreadsheetApp.openById(idSheet);
    const hoja = hojaDeCalculo.getSheetByName(nombreHoja);
    //Generamos un un id 
    var ahora = new Date();
    var nuevoID = String(ahora.getDate())
                  + String(parseInt(ahora.getMonth())+1)
                  + String(ahora.getFullYear())
                  + String(ahora.getHours())
                  + String(ahora.getMinutes())
                  + String(ahora.getSeconds())
                  + String(ahora.getMilliseconds());
    datos[0] = String(nuevoID);
    //Lo agregamos a la hoja
    hoja.appendRow(datos);
}
var normalize = (function() {
    var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç", 
        to   = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
        mapping = {};
   
    for(var i = 0, j = from.length; i < j; i++ )
        mapping[ from.charAt( i ) ] = to.charAt( i );
   
    return function( str ) {
        var ret = [];
        for( var i = 0, j = str.length; i < j; i++ ) {
            var c = str.charAt( i );
            if( mapping.hasOwnProperty( str.charAt( i ) ) )
                ret.push( mapping[ c ] );
            else
                ret.push( c );
        }      
        return ret.join( '' );
    }
   
})();
function listarUsuariosDeUnDirectorio(nombreDirectorio) {
    var pageToken;
    var page;
    do {
    page = AdminDirectory.Users.list({
        domain: 'institutodetierrasblancas.cl',
        query: "orgUnitPath:'"+nombreDirectorio+"'",
        orderBy : 'familyName',
        pageToken: pageToken
    });
    var users = page.users;
    if (users) {
        return users.map(alumno=>{
            return {
                nombreCompleto : normalize(alumno.name.fullName),
                id : alumno.id
            }
        });
    } else {
        return null;
    }
    pageToken = page.nextPageToken;
    } while (pageToken);
}

function listarDirectorios() {
    var page = AdminDirectory.Orgunits.list('my_customer', {
        orgUnitPath: 'Estudiantes',
        type: 'all'
      });
      var orgUnits = page.organizationUnits;
      
      if (orgUnits) {
        return orgUnits;
        for (var i = 0; i < orgUnits.length; i++) {
          var orgUnit = orgUnits[i];
          Logger.log('%s (%s)', orgUnit.name, orgUnit.orgUnitPath, orgUnit.description);
        }
      } else {
          return [];
        Logger.log('No OUs found.');
      }
}

function mostrarAlumnosPorCurso(){
    let directorios = listarDirectorios();
    let alumnos = [];
    directorios.forEach(directorio=>{
        alumnos.push({
            curso : directorio.name,
            alumnos : listarUsuariosDeUnDirectorio(directorio.orgUnitPath)
        });
    });
    return alumnos;
}