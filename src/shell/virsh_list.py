import json
import os   
import sys
# Import third party libs
try:
    import libvirt
    HAS_LIBVIRT = True
except ImportError:
    HAS_LIBVIRT = False
     
VIRT_STATE_NAME_MAP = {0: 'running',
                       1: 'running',
                       2: 'running',
                       3: 'paused',
                       4: 'shutdown',
                       5: 'shutdown',
                       6: 'crashed'}

def __get_conn():
    '''
    Detects what type of dom this node is and attempts to connect to the
    correct hypervisor via libvirt.
    '''
    # This has only been tested on kvm and xen, it needs to be expanded to
    # support all vm layers supported by libvirt
    try:
        conn = libvirt.open('qemu:///system')
    except Exception:
        raise Exception('get_conn','Sorry, {0} failed to open a connection to the hypervisor ')
	sys.exit(1)

    return conn

def _get_dom(vm_):
    '''
    Return a domain object for the named vm
    '''
    if vm_ not in list_vms():
        raise Exception('get_dom','The specified vm is not present')
    return conn.lookupByName(vm_)

def list_vms():
    '''
    Return a list of virtual machine names on the minion
   
    CLI Example::
   
        salt '*' virt.list_vms
    '''
    vms = []
    vms.extend(list_active_vms())
    vms.extend(list_inactive_vms())
    return vms
   
   
def list_active_vms():
    '''
    Return a list of names for active virtual machine on the minion
   
    CLI Example::
   
        salt '*' virt.list_active_vms
    '''
    vms = []
    for id_ in conn.listDomainsID():
        vms.append(conn.lookupByID(id_).name())
    return vms
   
   
def list_inactive_vms():
    '''
    Return a list of names for inactive virtual machine on the minion
   
    CLI Example::
   
        salt '*' virt.list_inactive_vms
    '''
    vms = []
    for id_ in conn.listDefinedDomains():
        vms.append(id_)
    return vms

def vm_info(vm_=None):
    '''
    Return detailed information about the vms on this hyper in a
    '''
    try:
        def _info(vm_):
            dom = _get_dom(vm_)
            raw = dom.info()
            return {'state': VIRT_STATE_NAME_MAP.get(raw[0], 'unknown')}
        info = {}
        if vm_:
            info[vm_] = _info(vm_)
        else:
            for vm_ in list_vms():
                info[vm_] = _info(vm_)
        conn.close()
        return info
    except Exception:
        raise Exception('vm_info','vm_info exception ')
        conn.close()
        sys.exit(1)
        

conn = __get_conn()
sys.stdout.write(json.dumps(vm_info()))
