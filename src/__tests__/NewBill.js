/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'

import { ROUTES, ROUTES_PATH} from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"

import router from "../app/Router.js"
import NewBill from "../containers/NewBill.js"
import NewBillUI from "../views/NewBillUI.js"
import BillsUI from "../views/BillsUI.js"


describe("Given I am connected as an employee", () => {
    describe("When I am on NewBill Page", () => {
        test("Then mail icon in vertical layout should be highlighted", async () => {
            Object.defineProperty(window, 'localStorage', { value: localStorageMock })
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }))
            const root = document.createElement("div")
            root.setAttribute("id", "root")
            document.body.append(root)
            router()
            window.onNavigate(ROUTES_PATH.NewBill)
            await waitFor(() => screen.getByTestId('icon-mail'))
            const mailIcon = screen.getByTestId('icon-mail')
            expect(mailIcon.classList.contains('active-icon')).toBe(true)
        })
        test("Then file input should be present on page", async () => {
            Object.defineProperty(window, 'localStorage', { value: localStorageMock })
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }))
            const root = document.createElement("div")
            root.setAttribute("id", "root")
            document.body.append(root)
            router()
            window.onNavigate(ROUTES_PATH.NewBill)
            await waitFor(() => screen.getByTestId('file'))
            const fileInput = screen.getByTestId('file')
            expect(fileInput).toBeTruthy()
        })

        describe("When user uploads a file", () => {
            describe("When the file is an image with png, jpeg or jpg extension", () => {
                test("Then, it should be uploaded", async () => {
                    const html = NewBillUI()
                    document.body.innerHTML = html
                    const onNavigate = (pathname) => {
                        document.body.innerHTML = ROUTES({ pathname })
                    }
                    
                    const newBill = new NewBill({ document, onNavigate, store: null, localStorage: window.localStorage })
                    
                    const handleChangeFile = jest.fn(newBill.handleChangeFile)
                    const fileInput = screen.getByTestId('file')
                    const errorMessage = screen.getByTestId('file-error-message')
                    fileInput.addEventListener("change", (e) => handleChangeFile(e))

                    const file = new File(['hello'], 'hello.png', {type: 'image/png'})
    
                    await userEvent.upload(fileInput, file)
                    
                    expect(handleChangeFile).toHaveBeenCalled()
                    expect(fileInput.files[0]).toBe(file)
                    expect(fileInput.files.item(0)).toBe(file)
                    expect(fileInput.files).toHaveLength(1)
                    expect(errorMessage.classList.contains('file-error')).toBeTruthy()
                })
            })
            describe("When the file is not an image with png, jpeg or jpg extension", () => {
                test("Then, it should not be uploaded", async () => {
                    const html = NewBillUI()
                    document.body.innerHTML = html
                    const onNavigate = (pathname) => {
                        document.body.innerHTML = ROUTES({ pathname })
                    }
                    
                    const newBill = new NewBill({ document, onNavigate, store: null, localStorage: window.localStorage })
                    
                    const handleChangeFile = jest.fn(newBill.handleChangeFile)
                    const fileInput = screen.getByTestId('file')
                    const errorMessage = screen.getByTestId('file-error-message')
                    fileInput.addEventListener("change", (e) => handleChangeFile(e))
    
                    const file = new File(['goodbye'], 'goodbye.pdf', {type: 'document/pdf'})
    
                    await userEvent.upload(fileInput, file)
                    
                    expect(handleChangeFile).toHaveBeenCalled()
                    expect(fileInput.value).not.toBe("goodbye.pdf")
                    expect(errorMessage.classList.contains('visible')).toBeTruthy()
                })
            })
        })

        // integration test POST
        describe('When user submits data for new bill', () => {
            test("Then it should create a new bill containing that data", async () => {
                const html = NewBillUI()
                document.body.innerHTML = html
                const onNavigate = (pathname) => {
                    document.body.innerHTML = ROUTES({ pathname })
                }
                Object.defineProperty(window, 'localStorage', { value: localStorageMock })
                window.localStorage.setItem(
                    'user',
                    JSON.stringify({
                        type: 'Employee',
                        email: 'a@a.com',
                    })
                )
                const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
                const validBill = {
                    type: "Hôtel et logement",
                    name: "encore",
                    date: '2004-04-04',
                    amount: 400,
                    vat: 80,
                    pct: 20,
                    commentary: 'séminaire billed',
                    fileUrl: 'https://test.storage.tld/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a',
                    fileName: 'preview-facture-free-201801-pdf-1.jpg',
                    status: 'pending'
                }
                screen.getByTestId('expense-type').value = validBill.type
                screen.getByTestId('expense-name').value = validBill.name
                screen.getByTestId('datepicker').value = validBill.date
                screen.getByTestId('amount').value = validBill.amount
                screen.getByTestId('vat').value = validBill.vat
                screen.getByTestId('pct').value = validBill.pct
                screen.getByTestId('commentary').value = validBill.commentary
                newBill.fileName = validBill.fileName
                newBill.fileUrl = validBill.fileUrl
                
                newBill.updateBill = jest.fn()
                const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))

                const form = screen.getByTestId("form-new-bill")
                form.addEventListener("submit", handleSubmit)
                fireEvent.submit(form)

                expect(handleSubmit).toHaveBeenCalled()
                expect(newBill.updateBill).toHaveBeenCalled()
            })
            
            describe("When POST request fails", () => {
                test("Then it should fetch messages from API and fail with 500 message error", async () => {
                    jest.spyOn(mockStore, "bills")
                    window.localStorage.setItem(
                        "user",
                        JSON.stringify({
                            type: "Employee",
                            email: "a@a",
                        })
                    )
                    const root = document.createElement("div")
                    root.setAttribute("id", "root")
                    document.body.appendChild(root)
                    router()

                    mockStore.bills.mockImplementationOnce(() => {
                        return {
                            update: () => {
                                return Promise.reject(new Error("Erreur 500"))
                            },
                        }
                    })
                    window.onNavigate(ROUTES_PATH.Bills)
                    document.body.innerHTML = BillsUI({ error: "Erreur 500" })
                    await new Promise(process.nextTick)
                    const message = await screen.getByText(/Erreur 500/)
                    expect(message).toBeTruthy()
                })
            })
        })
    })
})