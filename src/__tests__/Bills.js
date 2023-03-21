/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import userEvent from '@testing-library/user-event'

import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills"

import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"

import router from "../app/Router.js"

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      // ✅ expect expression
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    test("Then bills should be ordered from earliest to latest", () => {
        document.body.innerHTML = BillsUI({ data: bills })
        const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
        const antiChrono = (a, b) => ((a < b) ? 1 : -1)
        const datesSorted = [...dates].sort(antiChrono)
        expect(dates).toEqual(datesSorted)
    })
  })
})

describe("Given that I am an employee on BillsUI", () => {
    describe("When I click on new bill button", () => {
        test("Then it should render NewBill page", () => {
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname })
            }
            Object.defineProperty(window, 'localStorage', { value: localStorageMock })
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }))
            document.body.innerHTML = BillsUI({data : bills})
            const myBills = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage })
            const handleClickNewBill = jest.fn(myBills.handleClickNewBill)

            const buttonNewBill = screen.getByTestId("btn-new-bill")

            buttonNewBill.addEventListener("click", handleClickNewBill())
            userEvent.click(buttonNewBill)
            expect(handleClickNewBill).toHaveBeenCalled()
            expect(screen.getByTestId("form-new-bill")).toBeTruthy()
            expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
        })
    })
    describe("When I click on icon eye", () => {
        test("Then it should open the bill modal", () => {
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname })
            }
            Object.defineProperty(window, 'localStorage', { value: localStorageMock })
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }))
            document.body.innerHTML = BillsUI({data : bills})
            const myBills = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage })

            $.fn.modal = jest.fn() //mocks the jQuery modal function for easier testing

            const iconEye = screen.getAllByTestId("icon-eye")[0]
            const handleClickIconEye = jest.fn(myBills.handleClickIconEye(iconEye))

            iconEye.addEventListener("click", handleClickIconEye())
            userEvent.click(iconEye)
            expect(handleClickIconEye).toHaveBeenCalled()
            expect(screen.getByText("Justificatif")).toBeTruthy()
        })
    })
})

// test d'intégration GET
describe("Given I am a user connected as Employee", () => {
    describe("When I navigate to BillsUI", () => {
        test("fetches bills from mock API GET", async () => {
            Object.defineProperty(window, "localStorage", { value: localStorageMock })
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "a@a",
				})
			)
			const root = document.createElement("div")
			root.setAttribute("id", "root")
			document.body.append(root)
			router()

			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({ pathname })
			}
			const mockedBills = new Bills({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			})
			console.log(mockStore)
			const bills = await mockedBills.getBills()
			expect(bills.length > 0).toBeTruthy()
        })
        describe("When an error occurs on API", () => {
            beforeEach(() => {
                // Creates a mock function that spies on `bills()` exported from store.
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
            })
            test("fetches bills from an API and fails with 404 message error", async () => {
                // Accepts a function that will be used as an implementation of the mock for one call to the mocked function.
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list : () =>  {
                            return Promise.reject(new Error("Erreur 404"))
                        }
                    }
                })
                window.onNavigate(ROUTES_PATH.Bills);
                document.body.innerHTML = BillsUI({ error: "Erreur 404" });
                // Wait for the next tick of the event loop, ensuring that all previous promises and callbacks have been processed before continuing the test execution.
                await new Promise(process.nextTick);
                const message = await screen.getByText(/Erreur 404/)
                expect(message).toBeTruthy()
            })
  
            test("fetches messages from an API and fails with 500 message error", async () => {
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
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