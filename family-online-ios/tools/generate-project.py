"""Deterministically generate the checked-in Xcode project; no third-party generator."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
objects = {}
def ident(name): return hashlib.sha1(name.encode()).hexdigest()[:24].upper()
def add(label, **value):
    key = ident(label)
    objects[key] = value
    return key
def ref(name, path, kind, source='<group>'):
    return add(name, isa='PBXFileReference', lastKnownFileType=kind, path=path, sourceTree=source)
def build(name, file): return add(name, isa='PBXBuildFile', fileRef=file)
def serialize(value, depth=0):
    indent='\t'*depth
    if isinstance(value,dict):
        return '{\n'+''.join('\t'*(depth+1)+json.dumps(str(k))+ ' = '+serialize(v,depth+1)+';\n' for k,v in value.items())+indent+'}'
    if isinstance(value,list):
        return '(\n'+''.join('\t'*(depth+1)+serialize(v,depth+1)+',\n' for v in value)+indent+')'
    return json.dumps(str(value),ensure_ascii=False)

app=ident('app-target'); tests=ident('tests-target'); project=ident('project')
sources=[]; files=[]
for name in ['WritingStudioApp','StudioPolicy','ExportReceiver','StudioViewController']:
    file=ref('swift-'+name,'Sources/WritingStudio/'+name+'.swift','sourcecode.swift')
    files.append(file);sources.append(build('build-'+name,file))
info=ref('info','Sources/WritingStudio/Info.plist','text.plist.xml');files.append(info)
assets=ref('assets','Sources/WritingStudio/Assets.xcassets','folder.assetcatalog');files.append(assets)
script=ref('bridge','Sources/WritingStudio/Resources/native-bridge.js','sourcecode.javascript');files.append(script)
privacy=ref('privacy','Sources/WritingStudio/Resources/PrivacyInfo.xcprivacy','text.xml');files.append(privacy)
ui=ref('ui-tests','UITests/StudioLaunchTests.swift','sourcecode.swift')
product=add('app-product',isa='PBXFileReference',explicitFileType='wrapper.application',includeInIndex='0',path='WritingStudio.app',sourceTree='BUILT_PRODUCTS_DIR')
testProduct=add('test-product',isa='PBXFileReference',explicitFileType='wrapper.cfbundle',includeInIndex='0',path='WritingStudioUITests.xctest',sourceTree='BUILT_PRODUCTS_DIR')
sourceGroup=add('source-group',isa='PBXGroup',name='WritingStudio',children=files,sourceTree='<group>')
testGroup=add('test-group',isa='PBXGroup',name='UITests',children=[ui],sourceTree='<group>')
products=add('products',isa='PBXGroup',name='Products',children=[product,testProduct],sourceTree='<group>')
mainGroup=add('main-group',isa='PBXGroup',children=[sourceGroup,testGroup,products],sourceTree='<group>')
appSources=add('app-sources',isa='PBXSourcesBuildPhase',buildActionMask='2147483647',files=sources,runOnlyForDeploymentPostprocessing='0')
resources=add('app-resources',isa='PBXResourcesBuildPhase',buildActionMask='2147483647',files=[build('assets-build',assets),build('bridge-build',script),build('privacy-build',privacy)],runOnlyForDeploymentPostprocessing='0')
frameworks=add('app-frameworks',isa='PBXFrameworksBuildPhase',buildActionMask='2147483647',files=[],runOnlyForDeploymentPostprocessing='0')
testSources=add('test-sources',isa='PBXSourcesBuildPhase',buildActionMask='2147483647',files=[build('ui-tests-build',ui)],runOnlyForDeploymentPostprocessing='0')
testFrameworks=add('test-frameworks',isa='PBXFrameworksBuildPhase',buildActionMask='2147483647',files=[],runOnlyForDeploymentPostprocessing='0')
proxy=add('test-proxy',isa='PBXContainerItemProxy',containerPortal=project,proxyType='1',remoteGlobalIDString=app,remoteInfo='WritingStudio')
dependency=add('test-dependency',isa='PBXTargetDependency',target=app,targetProxy=proxy)

appSettings={
 'PRODUCT_BUNDLE_IDENTIFIER':'com.saadrawdan.writingstudio','PRODUCT_NAME':'$(TARGET_NAME)',
 'INFOPLIST_FILE':'Sources/WritingStudio/Info.plist','GENERATE_INFOPLIST_FILE':'NO',
 'ASSETCATALOG_COMPILER_APPICON_NAME':'AppIcon','CODE_SIGN_STYLE':'Automatic',
 'SWIFT_VERSION':'5.0','IPHONEOS_DEPLOYMENT_TARGET':'17.4','TARGETED_DEVICE_FAMILY':'1,2',
 'SUPPORTED_PLATFORMS':'iphoneos iphonesimulator','SUPPORTS_MACCATALYST':'NO',
 'LD_RUNPATH_SEARCH_PATHS':['$(inherited)','@executable_path/Frameworks'],
 'CURRENT_PROJECT_VERSION':'1','MARKETING_VERSION':'1.0.0','ENABLE_USER_SCRIPT_SANDBOXING':'YES',
}
testSettings={'PRODUCT_BUNDLE_IDENTIFIER':'com.saadrawdan.writingstudio.UITests','PRODUCT_NAME':'$(TARGET_NAME)',
 'GENERATE_INFOPLIST_FILE':'YES','SWIFT_VERSION':'5.0','IPHONEOS_DEPLOYMENT_TARGET':'17.4',
 'TARGETED_DEVICE_FAMILY':'1,2','CODE_SIGN_STYLE':'Automatic','TEST_TARGET_NAME':'WritingStudio',
 'SUPPORTED_PLATFORMS':'iphoneos iphonesimulator'}
projectSettings={'SDKROOT':'iphoneos','CLANG_ENABLE_MODULES':'YES','CLANG_ENABLE_OBJC_ARC':'YES',
 'IPHONEOS_DEPLOYMENT_TARGET':'17.4','SWIFT_VERSION':'5.0','ENABLE_USER_SCRIPT_SANDBOXING':'YES'}
def configurations(label,base):
    configs=[]
    for variant in ['Debug','Release']:
        settings=dict(base)
        settings['SWIFT_OPTIMIZATION_LEVEL']='-Onone' if variant=='Debug' else '-O'
        if variant=='Debug': settings.update({'SWIFT_ACTIVE_COMPILATION_CONDITIONS':'DEBUG $(inherited)','ENABLE_TESTABILITY':'YES','DEBUG_INFORMATION_FORMAT':'dwarf'})
        else: settings.update({'DEBUG_INFORMATION_FORMAT':'dwarf-with-dsym','SWIFT_COMPILATION_MODE':'wholemodule'})
        configs.append(add(label+'-'+variant,isa='XCBuildConfiguration',buildSettings=settings,name=variant))
    return add(label+'-list',isa='XCConfigurationList',buildConfigurations=configs,defaultConfigurationIsVisible='0',defaultConfigurationName='Release')
appConfigs=configurations('app-config',appSettings)
testConfigs=configurations('test-config',testSettings)
projectConfigs=configurations('project-config',projectSettings)
add('app-target',isa='PBXNativeTarget',buildConfigurationList=appConfigs,buildPhases=[appSources,frameworks,resources],buildRules=[],dependencies=[],name='WritingStudio',productName='WritingStudio',productReference=product,productType='com.apple.product-type.application')
add('tests-target',isa='PBXNativeTarget',buildConfigurationList=testConfigs,buildPhases=[testSources,testFrameworks],buildRules=[],dependencies=[dependency],name='WritingStudioUITests',productName='WritingStudioUITests',productReference=testProduct,productType='com.apple.product-type.bundle.ui-testing')
add('project',isa='PBXProject',attributes={'LastUpgradeCheck':'1640','TargetAttributes':{app:{'CreatedOnToolsVersion':'16.4'},tests:{'CreatedOnToolsVersion':'16.4','TestTargetID':app}}},buildConfigurationList=projectConfigs,compatibilityVersion='Xcode 14.0',developmentRegion='ar',hasScannedForEncodings='0',knownRegions=['ar','en','Base'],mainGroup=mainGroup,productRefGroup=products,projectDirPath='',projectRoot='',targets=[app,tests])
folder=ROOT/'WritingStudio.xcodeproj';folder.mkdir(exist_ok=True)
(folder/'project.pbxproj').write_text('// !$*UTF8*$!\n'+serialize({'archiveVersion':'1','classes':{},'objectVersion':'56','objects':objects,'rootObject':project})+'\n')
schemes=folder/'xcshareddata/xcschemes';schemes.mkdir(parents=True,exist_ok=True)
appRef=f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{app}" BuildableName="WritingStudio.app" BlueprintName="WritingStudio" ReferencedContainer="container:WritingStudio.xcodeproj"/>'
testRef=f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{tests}" BuildableName="WritingStudioUITests.xctest" BlueprintName="WritingStudioUITests" ReferencedContainer="container:WritingStudio.xcodeproj"/>'
scheme=f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1640" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
<BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{appRef}</BuildActionEntry>
<BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">{testRef}</BuildActionEntry>
</BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{testRef}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{appRef}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO"><BuildableProductRunnable runnableDebuggingMode="0">{appRef}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
'''
(schemes/'WritingStudio.xcscheme').write_text(scheme)
print('Generated WritingStudio.xcodeproj and shared scheme')
