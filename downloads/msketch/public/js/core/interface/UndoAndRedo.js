function checkHistory(){
	if(isPlaying) return;

	tempInfo = getMsketchInfo();

	if( tempInfo != historyInfo[ historyInfo.length - 1 - historyAddress ] ){
		historyInfo.splice( historyInfo.length - 1 - historyAddress + 1 , historyAddress );
		historyAddress = 0;
	}

	if(historyInfo[historyInfo.length-1] != tempInfo && historyAddress==0){
		historyInfo.push(tempInfo);
	}

	if(historyInfo.length > MAX_HISTORY){
		historyInfo.splice(0, 1);
	}

}

function undo(){
	if(isPlaying) return;
	if(historyInfo.length - 2 - historyAddress < 0) return;

	var _tempIndex = findCurrentAssemblyNum();

	historyAddress++;
	loadMsketchInfo( historyInfo[historyInfo.length - 1 - historyAddress] , false);

	try360forAssemblies();

	selectAssembly(_tempIndex);
}

function redo(){
	if(isPlaying) return;
	if(historyAddress<1) return;

	var _tempIndex = findCurrentAssemblyNum();

	historyAddress--;
	loadMsketchInfo( historyInfo[historyInfo.length - 1 - historyAddress] , false);

	try360forAssemblies();

	selectAssembly(_tempIndex);
}
